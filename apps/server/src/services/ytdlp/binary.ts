import type { BinaryInfo, BinaryJob, BinaryJobAction, BinaryName, BinaryStatus } from '@yt-dlp-studio/shared'
import type { Buffer } from 'node:buffer'
import type { EventBus } from '../events'
import type { SettingsService } from '../settings'
import type { ReleaseFile } from './sources'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { extractArchive, findFiles } from '../../utils/archive'
import { downloadFile, SpeedMeter } from '../../utils/download'
import { ensureDir, pathExists } from '../../utils/fs'
import { createId } from '../../utils/id'
import { createLogger } from '../../utils/logger'
import { execCapture, isWindows, killProcessTree } from '../../utils/process'
import { getFfmpegRelease, getYtdlpRelease, withMirror } from './sources'

const logger = createLogger('binary')
const LOG_LIMIT = 40
const EMIT_INTERVAL = 250

export const ytdlpEnv = {
  ...process.env,
  PYTHONIOENCODING: 'utf-8',
  PYTHONUTF8: '1',
}

const exe = (name: string) => isWindows ? `${name}.exe` : name

async function probe(command: string, args: string[], parse: (out: string) => string): Promise<string | null> {
  try {
    const result = await execCapture(command, args, { timeout: 30_000, env: ytdlpEnv })
    if (result.code !== 0)
      return null
    return parse(result.stdout.trim()) || null
  }
  catch {
    return null
  }
}

const probeYtdlp = (command: string) => probe(command, ['--version'], out => out.split('\n')[0])
const probeFfmpeg = (command: string) => probe(command, ['-version'], out => /ffmpeg version (\S+)/.exec(out)?.[1] ?? out.split('\n')[0])

class JobCancelled extends Error {
  constructor() {
    super('Cancelled by user')
  }
}

/**
 * Locates the yt-dlp / ffmpeg binaries and installs managed copies in the background.
 * Install progress is broadcast as `binary:job` events so every client can follow it.
 */
export class BinaryManager {
  private ytdlpCache: Promise<BinaryInfo | null> | null = null
  private ffmpegCache: Promise<BinaryInfo | null> | null = null
  private jobs: Record<BinaryName, BinaryJob | null> = { ytdlp: null, ffmpeg: null }
  private controllers = new Map<BinaryName, AbortController>()
  private emittedAt = new Map<BinaryName, number>()
  /** Last detection result, so only changes are logged */
  private detected = new Map<BinaryName, string>()

  constructor(
    private readonly dataDir: string,
    private readonly settings: SettingsService,
    private readonly events: EventBus,
  ) {
    settings.onChange((next, prev) => {
      if (next.ytdlpPath !== prev.ytdlpPath)
        this.ytdlpCache = null
      if (next.ffmpegPath !== prev.ffmpegPath)
        this.ffmpegCache = null
    })
  }

  private get binDir() {
    return path.join(this.dataDir, 'bin')
  }

  private managed(name: 'yt-dlp' | 'ffmpeg' | 'ffprobe') {
    return path.join(this.binDir, exe(name))
  }

  invalidate() {
    this.ytdlpCache = null
    this.ffmpegCache = null
  }

  ytdlp() {
    this.ytdlpCache ??= this.find(this.settings.value.ytdlpPath, this.managed('yt-dlp'), 'yt-dlp', probeYtdlp).then((info) => {
      if (!info)
        this.ytdlpCache = null
      this.logDetection('ytdlp', info)
      return info
    })
    return this.ytdlpCache
  }

  ffmpeg() {
    this.ffmpegCache ??= this.find(this.settings.value.ffmpegPath, this.managed('ffmpeg'), 'ffmpeg', probeFfmpeg).then((info) => {
      if (!info)
        this.ffmpegCache = null
      this.logDetection('ffmpeg', info)
      return info
    })
    return this.ffmpegCache
  }

  private logDetection(binary: BinaryName, info: BinaryInfo | null) {
    const key = info ? `${info.path}@${info.version}` : ''
    if (this.detected.get(binary) === key)
      return
    this.detected.set(binary, key)
    const name = binary === 'ytdlp' ? 'yt-dlp' : 'ffmpeg'
    if (info)
      logger.info(`Using ${name} ${info.version}`, { data: { path: info.path, managed: info.managed ?? false } })
    else
      logger.warn(`${name} not found`, { detail: binary === 'ytdlp' ? 'Install it from Settings → System, or set its path' : 'Merging formats and post-processing are unavailable' })
  }

  /** Resolve the yt-dlp command or throw a friendly error */
  async requireYtdlp() {
    const info = await this.ytdlp()
    if (!info)
      throw new Error('yt-dlp not found. Install it from Settings → System, or set its path.')
    return info.path
  }

  async status(): Promise<Record<BinaryName, BinaryStatus>> {
    const [ytdlp, ffmpeg] = await Promise.all([this.ytdlp(), this.ffmpeg()])
    return {
      ytdlp: { info: ytdlp, installable: Boolean(getYtdlpRelease()), job: this.jobs.ytdlp },
      ffmpeg: { info: ffmpeg, installable: Boolean(getFfmpegRelease()), job: this.jobs.ffmpeg },
    }
  }

  private async find(custom: string, managed: string, fallback: string, check: (command: string) => Promise<string | null>): Promise<BinaryInfo | null> {
    const candidates: { path: string, managed?: boolean }[] = []
    if (custom)
      candidates.push({ path: custom })
    if (await pathExists(managed))
      candidates.push({ path: managed, managed: true })
    candidates.push({ path: fallback })
    for (const candidate of candidates) {
      const version = await check(candidate.path)
      if (version)
        return { ...candidate, version }
    }
    return null
  }

  /** Start an install / update job, or return the one already running */
  start(binary: BinaryName, action: BinaryJobAction): BinaryJob {
    const running = this.jobs[binary]
    if (running?.status === 'running')
      return running

    const job: BinaryJob = {
      id: createId(),
      binary,
      action,
      status: 'running',
      phase: 'preparing',
      step: 0,
      steps: 0,
      downloaded: 0,
      startedAt: Date.now(),
      log: [],
    }
    const controller = new AbortController()
    this.jobs[binary] = job
    this.controllers.set(binary, controller)
    this.emit(job, true)
    const name = binary === 'ytdlp' ? 'yt-dlp' : 'ffmpeg'
    logger.info(`${action === 'install' ? 'Installing' : 'Updating'} ${name}`, { ref: job.id, data: { mirror: this.settings.value.githubMirror.trim() || undefined } })

    void this.execute(job, controller.signal)
      .then((version) => {
        this.patch(job, { status: 'success', phase: 'done', version, speed: undefined })
        this.log(job, `${name} ${version} is ready`)
      })
      .catch((error) => {
        const cancelled = controller.signal.aborted && controller.signal.reason instanceof JobCancelled
        const message = error instanceof Error ? error.message : String(error)
        if (cancelled)
          logger.info(`${name} ${action} cancelled`, { ref: job.id })
        else
          logger.error(`${name} ${action} failed`, { ref: job.id, detail: message })
        this.log(job, cancelled ? 'Cancelled' : `Error: ${message}`, false)
        this.patch(job, { status: cancelled ? 'cancelled' : 'error', error: cancelled ? undefined : message, speed: undefined })
      })
      .finally(() => {
        this.controllers.delete(binary)
        this.invalidate()
        job.finishedAt = Date.now()
        this.emit(job, true)
      })
    return job
  }

  cancel(binary: BinaryName) {
    const controller = this.controllers.get(binary)
    if (!controller)
      return false
    controller.abort(new JobCancelled())
    return true
  }

  private async execute(job: BinaryJob, signal: AbortSignal) {
    if (job.binary === 'ytdlp') {
      const current = await this.ytdlp()
      if (job.action === 'update' && current && !current.managed)
        return this.selfUpdate(job, current.path, signal)
      return this.installYtdlp(job, signal)
    }
    return this.installFfmpeg(job, signal)
  }

  private async installYtdlp(job: BinaryJob, signal: AbortSignal) {
    const files = getYtdlpRelease()
    if (!files)
      throw new Error(`No prebuilt yt-dlp for ${process.platform}-${process.arch}, please install it manually`)
    const tmpDir = await this.tmpDir(job)
    try {
      const [downloaded] = await this.download(job, files, tmpDir, signal)
      this.patch(job, { phase: 'verifying' }, true)
      const target = this.managed('yt-dlp')
      await this.place(downloaded, target)
      const version = await probeYtdlp(target)
      if (!version)
        throw new Error('Downloaded yt-dlp is not executable on this system')
      this.log(job, `Installed to ${target}`)
      return version
    }
    finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  }

  private async installFfmpeg(job: BinaryJob, signal: AbortSignal) {
    const files = getFfmpegRelease()
    if (!files)
      throw new Error(`No prebuilt ffmpeg for ${process.platform}-${process.arch}, please install it with your system package manager`)
    const tmpDir = await this.tmpDir(job)
    try {
      const archives = await this.download(job, files, tmpDir, signal)
      this.patch(job, { phase: 'extracting', speed: undefined }, true)
      const extractDir = path.join(tmpDir, 'extract')
      for (const archive of archives) {
        this.throwIfAborted(signal)
        this.log(job, `Extracting ${path.basename(archive)}`)
        await extractArchive(archive, extractDir)
      }
      const found = await findFiles(extractDir, [exe('ffmpeg'), exe('ffprobe')])
      const ffmpeg = found.get(exe('ffmpeg'))
      if (!ffmpeg)
        throw new Error('ffmpeg executable not found in the downloaded archive')

      this.patch(job, { phase: 'verifying' }, true)
      await this.place(ffmpeg, this.managed('ffmpeg'))
      const ffprobe = found.get(exe('ffprobe'))
      if (ffprobe)
        await this.place(ffprobe, this.managed('ffprobe'))
      else
        this.log(job, 'Warning: ffprobe was not found in the archive')
      const version = await probeFfmpeg(this.managed('ffmpeg'))
      if (!version)
        throw new Error('Downloaded ffmpeg is not executable on this system')
      this.log(job, `Installed to ${this.binDir}`)
      return version
    }
    finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  }

  /** `yt-dlp -U` for binaries not managed by us (pip / package manager installs may refuse) */
  private selfUpdate(job: BinaryJob, command: string, signal: AbortSignal) {
    this.patch(job, { phase: 'updating' }, true)
    this.log(job, `Running ${command} -U`)
    return new Promise<string>((resolve, reject) => {
      const child = spawn(command, ['-U'], { env: ytdlpEnv, windowsHide: true, detached: !isWindows, stdio: ['ignore', 'pipe', 'pipe'] })
      const onAbort = () => killProcessTree(child)
      signal.addEventListener('abort', onAbort, { once: true })
      const onData = (chunk: Buffer) => {
        for (const line of chunk.toString('utf8').split(/\r?\n/)) {
          if (line.trim())
            this.log(job, line.trim())
        }
      }
      child.stdout!.on('data', onData)
      child.stderr!.on('data', onData)
      child.on('error', reject)
      child.on('close', async (code) => {
        signal.removeEventListener('abort', onAbort)
        if (signal.aborted)
          return reject(signal.reason)
        if (code !== 0)
          return reject(new Error(job.log.at(-1) ?? `yt-dlp -U exited with code ${code}`))
        this.ytdlpCache = null
        const version = await probeYtdlp(command)
        version ? resolve(version) : reject(new Error('yt-dlp is not executable after update'))
      })
    })
  }

  /** Download all release files into `dir`, returning the local paths */
  private async download(job: BinaryJob, files: ReleaseFile[], dir: string, signal: AbortSignal) {
    const mirror = this.settings.value.githubMirror.trim()
    const result: string[] = []
    const meter = new SpeedMeter()
    for (const [index, file] of files.entries()) {
      this.throwIfAborted(signal)
      const url = withMirror(file, mirror)
      const dest = path.join(dir, file.name)
      meter.reset()
      this.patch(job, { phase: 'downloading', file: file.name, step: index + 1, steps: files.length, downloaded: 0, total: undefined, speed: undefined }, true)
      this.log(job, `Downloading ${url}`)
      const { downloaded } = await downloadFile(url, dest, {
        signal,
        onProgress: ({ downloaded, total }) => {
          meter.push(downloaded)
          this.patch(job, { downloaded, total, speed: meter.speed })
        },
      })
      if (downloaded < 512 * 1024)
        throw new Error(`Unexpected file size ${downloaded} bytes, the download source or mirror may be invalid`)
      this.log(job, `Downloaded ${file.name} (${(downloaded / 1024 / 1024).toFixed(1)} MiB)`)
      result.push(dest)
    }
    return result
  }

  private async tmpDir(job: BinaryJob) {
    const dir = path.join(this.binDir, `.tmp-${job.id}`)
    await ensureDir(dir)
    return dir
  }

  /** Atomically move an executable into the managed bin directory */
  private async place(source: string, target: string) {
    await ensureDir(path.dirname(target))
    const staging = `${target}.new`
    await fs.copyFile(source, staging)
    await fs.chmod(staging, 0o755)
    await fs.rename(staging, target)
  }

  private throwIfAborted(signal: AbortSignal) {
    if (signal.aborted)
      throw signal.reason
  }

  /** Append to the job log shown in the UI, mirrored to the app log unless already logged */
  private log(job: BinaryJob, line: string, mirror = true) {
    job.log.push(line)
    if (job.log.length > LOG_LIMIT)
      job.log.splice(0, job.log.length - LOG_LIMIT)
    if (mirror)
      logger.info(line, { ref: job.id })
    this.emit(job)
  }

  private patch(job: BinaryJob, patch: Partial<BinaryJob>, force = false) {
    Object.assign(job, patch)
    this.emit(job, force || Boolean(patch.status))
  }

  /** Broadcast job state, throttling frequent progress updates */
  private emit(job: BinaryJob, force = false) {
    const now = Date.now()
    if (!force && now - (this.emittedAt.get(job.binary) ?? 0) < EMIT_INTERVAL)
      return
    this.emittedAt.set(job.binary, now)
    this.events.emit({ type: 'binary:job', job: structuredClone(job) })
  }
}
