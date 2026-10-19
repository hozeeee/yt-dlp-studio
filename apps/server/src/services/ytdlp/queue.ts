import type { AddDownloadsResponse, DownloadEntry, DownloadOptions, DownloadTask, TaskAction, TaskPatch, TaskProgress } from '@yt-dlp-studio/shared'
import type { ChildProcess } from 'node:child_process'
import type { CookieService } from '../cookies'
import type { EventBus } from '../events'
import type { SettingsService } from '../settings'
import type { BinaryManager } from './binary'
import type { InfoService } from './info'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { mergeDownloadOptions } from '../../schemas'
import { ensureDir, getFileSize, resolveInside, toPosix } from '../../utils/fs'
import { createId } from '../../utils/id'
import { createLogger } from '../../utils/logger'
import { isWindows, killProcessTree } from '../../utils/process'
import { JsonStore } from '../store'
import { buildDownloadArgs, MARK_FILE, MARK_INFO, MARK_POSTPROCESS, MARK_PROGRESS } from './args'
import { ytdlpEnv } from './binary'

const logger = createLogger('queue')
const EMPTY_PROGRESS: TaskProgress = { percent: 0, downloaded: 0, total: null, speed: null, eta: null }

interface RunningTask {
  child: ChildProcess
  stopReason?: 'pause' | 'cancel' | 'shutdown'
  output: Set<string>
  errors: string[]
  updateTimer?: NodeJS.Timeout
  pendingPatch?: TaskPatch
}

export class DownloadQueue {
  private store: JsonStore<{ tasks: DownloadTask[] }>
  private running = new Map<string, RunningTask>()
  private scheduling = false
  private closed = false
  private clearTimer?: NodeJS.Timeout

  constructor(
    private readonly dataDir: string,
    private readonly settings: SettingsService,
    private readonly bus: EventBus,
    private readonly binaries: BinaryManager,
    private readonly info: InfoService,
    private readonly cookies: CookieService,
  ) {
    this.store = new JsonStore(path.join(dataDir, 'tasks.json'), { tasks: [] }, 300)
    settings.onChange((next, prev) => {
      if (next.maxConcurrent !== prev.maxConcurrent)
        this.schedule()
      this.setupAutoClear()
    })
  }

  async init() {
    await this.store.load(raw => ({
      tasks: Array.isArray(raw.tasks)
        ? raw.tasks.map(task => ({
            ...task,
            status: ['downloading', 'processing'].includes(task.status) ? 'queued' as const : task.status,
            progress: task.status === 'completed' ? task.progress : { ...EMPTY_PROGRESS },
          }))
        : [],
    }))
    await this.store.flush()
    this.setupAutoClear()
    this.schedule()
  }

  list() { return this.store.data.tasks }
  get(id: string) { return this.list().find(task => task.id === id) }

  async addUrls(urls: string[], options?: Partial<DownloadOptions>, noPlaylist = false): Promise<AddDownloadsResponse> {
    const tasks: DownloadTask[] = []
    const errors: { url: string, error: string }[] = []
    for (const url of urls) {
      try {
        const merged = mergeDownloadOptions(this.settings.value.defaultOptions, options)
        const media = await this.info.get(url, true, merged.playlistLimit || undefined)
        if (media.type === 'playlist' && !noPlaylist && media.entries?.length) {
          tasks.push(...this.addEntries(media.entries.map((entry, index) => ({
            ...entry,
            playlist: { id: media.id, title: media.title, index: index + 1, count: media.playlistCount ?? media.entries!.length },
          })), merged))
        }
        else {
          tasks.push(...this.addEntries([{
            url: media.url || url,
            title: media.title,
            thumbnail: media.thumbnail,
            uploader: media.uploader,
            duration: media.duration,
          }], merged))
        }
      }
      catch (error) {
        errors.push({ url, error: error instanceof Error ? error.message : String(error) })
      }
    }
    return { tasks, errors }
  }

  addEntries(entries: DownloadEntry[], options?: Partial<DownloadOptions>, subscriptionId?: string) {
    const resolved = mergeDownloadOptions(this.settings.value.defaultOptions, options)
    const tasks: DownloadTask[] = entries.map(entry => ({
      id: createId(),
      url: entry.url,
      title: entry.title || entry.url,
      thumbnail: entry.thumbnail,
      uploader: entry.uploader,
      duration: entry.duration,
      status: 'queued',
      progress: { ...EMPTY_PROGRESS },
      options: { ...resolved },
      files: [],
      playlist: entry.playlist,
      subscriptionId,
      createdAt: Date.now(),
    }))
    this.list().unshift(...tasks)
    this.store.save()
    if (tasks.length)
      this.bus.emit({ type: 'task:added', tasks })
    this.schedule()
    return tasks
  }

  action(ids: string[], action: TaskAction) {
    for (const id of ids) {
      const task = this.get(id)
      if (!task)
        continue
      const active = this.running.get(id)
      if (action === 'pause' && ['queued', 'downloading', 'processing'].includes(task.status)) {
        if (active) {
          active.stopReason = 'pause'
          killProcessTree(active.child)
        }
        this.patch(id, { status: 'paused', progress: { ...task.progress, speed: null, eta: null } })
      }
      else if (action === 'resume' && task.status === 'paused') {
        this.patch(id, { status: 'queued', error: undefined })
      }
      else if (action === 'retry' && ['failed', 'canceled', 'completed'].includes(task.status)) {
        this.patch(id, { status: 'queued', error: undefined, progress: { ...EMPTY_PROGRESS }, startedAt: undefined, finishedAt: undefined, files: [], size: undefined })
      }
      else if (action === 'cancel' && !['completed', 'failed', 'canceled'].includes(task.status)) {
        if (active) {
          active.stopReason = 'cancel'
          killProcessTree(active.child)
        }
        this.patch(id, { status: 'canceled', finishedAt: Date.now(), progress: { ...task.progress, speed: null, eta: null } })
      }
    }
    this.schedule()
  }

  async remove(ids: string[], deleteFiles: boolean) {
    for (const id of ids) {
      const active = this.running.get(id)
      if (active) {
        active.stopReason = 'cancel'
        killProcessTree(active.child)
      }
      const task = this.get(id)
      if (deleteFiles && task) {
        for (const relative of task.files) {
          const file = resolveInside(this.settings.value.downloadDir, relative)
          if (file)
            await fs.rm(file, { force: true }).catch(() => {})
        }
      }
    }
    this.store.data.tasks = this.list().filter(task => !ids.includes(task.id))
    await this.store.flush()
    this.bus.emit({ type: 'task:removed', ids })
  }

  async clearFinished(deleteFiles: boolean) {
    const ids = this.list().filter(task => ['completed', 'failed', 'canceled'].includes(task.status)).map(task => task.id)
    await this.remove(ids, deleteFiles)
    return ids.length
  }

  async shutdown() {
    this.closed = true
    if (this.clearTimer)
      clearInterval(this.clearTimer)
    for (const state of this.running.values()) {
      state.stopReason = 'shutdown'
      killProcessTree(state.child)
    }
    await this.store.flush()
  }

  private schedule() {
    if (this.scheduling || this.closed)
      return
    this.scheduling = true
    queueMicrotask(() => {
      this.scheduling = false
      const available = Math.max(0, this.settings.value.maxConcurrent - this.running.size)
      for (const task of this.list().filter(task => task.status === 'queued').slice(0, available))
        void this.run(task)
    })
  }

  private async run(task: DownloadTask) {
    if (this.running.has(task.id) || task.status !== 'queued')
      return
    try {
      const command = await this.binaries.requireYtdlp()
      const outputDir = this.outputDir(task.options.folder)
      await ensureDir(outputDir)
      const ffmpeg = await this.binaries.ffmpeg()
      const settings = this.settings.value
      const child = spawn(command, buildDownloadArgs({
        url: task.url,
        options: task.options,
        outputDir,
        playlist: task.playlist,
        settings,
        cookiesFile: this.cookies.hasEnabled ? this.cookies.mergedFile : undefined,
        ffmpegPath: ffmpeg?.path,
        archiveFile: settings.useArchive ? path.join(this.dataDir, 'archive.txt') : undefined,
      }), { stdio: ['ignore', 'pipe', 'pipe'], env: ytdlpEnv, detached: !isWindows, windowsHide: true })
      const state: RunningTask = { child, output: new Set(), errors: [] }
      this.running.set(task.id, state)
      this.patch(task.id, { status: 'downloading', startedAt: task.startedAt ?? Date.now(), finishedAt: undefined, error: undefined })
      logger.info(`Started ${task.id}: ${task.title}`)
      this.lines(child.stdout!, line => this.stdout(task.id, line))
      this.lines(child.stderr!, (line) => {
        if (line.trim()) {
          state.errors.push(line)
          if (state.errors.length > 80)
            state.errors.shift()
        }
      })
      child.on('error', error => state.errors.push(error.message))
      child.on('close', code => void this.finish(task.id, code ?? 1))
    }
    catch (error) {
      this.patch(task.id, { status: 'failed', error: error instanceof Error ? error.message : String(error), finishedAt: Date.now() })
      this.schedule()
    }
  }

  private lines(stream: NodeJS.ReadableStream, listener: (line: string) => void) {
    let buffer = ''
    stream.setEncoding('utf8')
    stream.on('data', (chunk: string) => {
      buffer += chunk
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      lines.forEach(listener)
    })
    stream.on('end', () => buffer && listener(buffer))
  }

  private stdout(id: string, line: string) {
    const state = this.running.get(id)
    if (!state)
      return
    if (line.startsWith(MARK_PROGRESS)) {
      const [status, downloaded, total, estimate, speed, eta] = line.slice(MARK_PROGRESS.length).split('|')
      const done = this.num(downloaded) ?? 0
      const all = this.num(total) ?? this.num(estimate)
      this.patchSoon(id, {
        status: status === 'finished' ? 'processing' : 'downloading',
        progress: { percent: all ? Math.min(100, done / all * 100) : 0, downloaded: done, total: all, speed: this.num(speed), eta: this.num(eta) },
      })
    }
    else if (line.startsWith(MARK_POSTPROCESS)) {
      const task = this.get(id)
      const stage = line.slice(MARK_POSTPROCESS.length).split('|')[1]
      if (task)
        this.patchSoon(id, { status: 'processing', progress: { ...task.progress, speed: null, eta: null, stage } })
    }
    else if (line.startsWith(MARK_FILE)) {
      state.output.add(line.slice(MARK_FILE.length))
    }
    else if (line.startsWith(MARK_INFO)) {
      try {
        const info = JSON.parse(line.slice(MARK_INFO.length)) as { title?: string, thumbnail?: string, uploader?: string, channel?: string, duration?: number, extractor_key?: string }
        this.patch(id, { title: info.title, thumbnail: info.thumbnail, uploader: info.uploader ?? info.channel, duration: info.duration, extractor: info.extractor_key })
      }
      catch {}
    }
  }

  private async finish(id: string, code: number) {
    const state = this.running.get(id)
    if (!state)
      return
    this.flushSoon(id)
    this.running.delete(id)
    const task = this.get(id)
    if (!task)
      return this.schedule()
    if (state.stopReason === 'shutdown') {
      this.patch(id, { status: 'queued', progress: { ...EMPTY_PROGRESS } })
    }
    else if (!state.stopReason && code === 0) {
      const root = this.settings.value.downloadDir
      const files = [...state.output].map(file => path.relative(root, file)).filter(file => !file.startsWith('..') && !path.isAbsolute(file)).map(toPosix)
      let size = 0
      for (const file of files)
        size += await getFileSize(path.join(root, file))
      this.patch(id, { status: 'completed', progress: { percent: 100, downloaded: size, total: size, speed: null, eta: null }, files: [...new Set(files)], size, finishedAt: Date.now(), error: undefined })
      logger.info(`Completed ${id}: ${task.title}`)
    }
    else if (!state.stopReason) {
      this.patch(id, { status: 'failed', error: state.errors.slice(-8).join('\n') || `yt-dlp exited with code ${code}`, finishedAt: Date.now(), progress: { ...task.progress, speed: null, eta: null } })
      logger.warn(`Failed ${id}: ${task.title}`)
    }
    this.schedule()
  }

  private patch(id: string, values: Omit<TaskPatch, 'id'>) {
    const task = this.get(id)
    if (!task)
      return
    Object.assign(task, values)
    this.store.save()
    this.bus.emit({ type: 'task:updated', patch: { id, ...values } })
  }

  private patchSoon(id: string, values: Omit<TaskPatch, 'id'>) {
    const state = this.running.get(id)
    if (!state)
      return
    state.pendingPatch = { ...state.pendingPatch, id, ...values }
    state.updateTimer ??= setTimeout(() => this.flushSoon(id), 500)
  }

  private flushSoon(id: string) {
    const state = this.running.get(id)
    if (!state?.pendingPatch)
      return
    if (state.updateTimer)
      clearTimeout(state.updateTimer)
    state.updateTimer = undefined
    const { id: _, ...values } = state.pendingPatch
    state.pendingPatch = undefined
    this.patch(id, values)
  }

  private outputDir(folder?: string) {
    const dir = folder ? resolveInside(this.settings.value.downloadDir, folder) : this.settings.value.downloadDir
    if (!dir)
      throw new Error('Download folder must be inside the download directory')
    return dir
  }

  private num(value?: string) {
    const number = Number(value)
    return value && value !== 'NA' && value !== 'None' && Number.isFinite(number) ? number : null
  }

  private setupAutoClear() {
    if (this.clearTimer)
      clearInterval(this.clearTimer)
    this.clearTimer = setInterval(() => {
      const hours = this.settings.value.autoClearHours
      if (!hours)
        return
      const before = Date.now() - hours * 3_600_000
      const ids = this.list().filter(task => task.finishedAt && task.finishedAt < before && ['completed', 'failed', 'canceled'].includes(task.status)).map(task => task.id)
      if (ids.length)
        void this.remove(ids, false)
    }, 60_000)
    this.clearTimer.unref()
  }
}
