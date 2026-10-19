import type { MediaInfo } from '@yt-dlp-studio/shared'
import type { CookieService } from '../cookies'
import type { SettingsService } from '../settings'
import type { BinaryManager } from './binary'
import path from 'node:path'
import { ensureDir } from '../../utils/fs'
import { execCapture } from '../../utils/process'
import { buildCommonArgs } from './args'
import { ytdlpEnv } from './binary'
import { normalizeInfo, parseJsonOutput } from './parser'

export interface InfoRequest {
  /** Fetch playlist entries flat (fast) */
  flat?: boolean
  limit?: number
  /** Same as `DownloadOptions.cookies` */
  cookies?: string
  /** Stop waiting, e.g. when the HTTP client disconnected */
  signal?: AbortSignal
}

/** One yt-dlp run shared by every caller asking for the same info at the same time */
interface RunningInfo {
  promise: Promise<MediaInfo>
  controller: AbortController
  /** Callers still waiting; the process is killed once all of them gave up */
  waiters: number
}

export class InfoService {
  private running = new Map<string, RunningInfo>()

  constructor(
    private readonly dataDir: string,
    private readonly settings: SettingsService,
    private readonly binaries: BinaryManager,
    private readonly cookies: CookieService,
  ) {}

  /** Working directory of info extraction, so stray files never land in the server cwd */
  get workDir() {
    return path.join(this.dataDir, 'tmp')
  }

  async get(url: string, { flat = true, limit, cookies, signal }: InfoRequest = {}): Promise<MediaInfo> {
    if (signal?.aborted)
      throw new Error('Canceled')
    const key = `${url}\n${flat}\n${limit ?? ''}\n${cookies ?? ''}`
    let entry = this.running.get(key)
    if (!entry) {
      const controller = new AbortController()
      const created: RunningInfo = {
        controller,
        waiters: 0,
        promise: this.fetch(url, flat, limit, cookies, controller.signal).finally(() => {
          if (this.running.get(key) === created)
            this.running.delete(key)
        }),
      }
      this.running.set(key, created)
      entry = created
    }
    entry.waiters++
    // Callers without a signal (queue, subscriptions) keep the run alive until it ends
    if (!signal)
      return entry.promise

    const current = entry
    return new Promise<MediaInfo>((resolve, reject) => {
      const onAbort = () => {
        current.waiters--
        if (current.waiters <= 0) {
          current.controller.abort()
          if (this.running.get(key) === current)
            this.running.delete(key)
        }
        reject(new Error('Canceled'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
      current.promise
        .then(resolve, reject)
        .finally(() => signal.removeEventListener('abort', onAbort))
    })
  }

  private async fetch(url: string, flat: boolean, limit: number | undefined, cookies: string | undefined, signal: AbortSignal) {
    const command = await this.binaries.requireYtdlp()
    const ffmpeg = await this.binaries.ffmpeg()
    const settings = this.settings.value
    // `--dump-single-json` implies simulation, never add `--no-simulate` here or the media gets downloaded
    const args = [
      '--dump-single-json',
      '--skip-download',
      '--no-warnings',
      '--no-colors',
      '--no-progress',
    ]
    if (flat)
      args.push('--flat-playlist')
    if (limit && limit > 0)
      args.push('--playlist-end', String(limit))
    args.push(...buildCommonArgs({
      settings,
      cookies: this.cookies.resolve(cookies, settings),
      ffmpegPath: ffmpeg?.path,
    }))
    args.push('--', url)

    await ensureDir(this.workDir)
    const result = await execCapture(command, args, {
      timeout: flat ? 2 * 60_000 : 5 * 60_000,
      env: ytdlpEnv,
      cwd: this.workDir,
      signal,
      maxBuffer: 128 * 1024 * 1024,
    })
    if (result.code !== 0) {
      const message = result.stderr.trim().split('\n').slice(-5).join('\n') || 'yt-dlp failed to analyze URL'
      throw new Error(message)
    }
    return normalizeInfo(parseJsonOutput(result.stdout), url)
  }
}
