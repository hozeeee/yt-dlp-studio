import type { LogEntry, LogLevel, LogPage, LogQuery } from '@yt-dlp-studio/shared'
import type { LogRecord } from '../utils/logger'
import type { EventBus } from './events'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'
import { matchesLogQuery } from '@yt-dlp-studio/shared'
import { ensureDir } from '../utils/fs'
import { setLogSink } from '../utils/logger'

/** Entries kept in memory and restored at startup */
const MAX_ENTRIES = 5000
/** The log file is rotated once (`app.1.jsonl`) past this size */
const MAX_FILE_SIZE = 4 * 1024 * 1024
const WRITE_DELAY = 1000
const EMIT_INTERVAL = 300
const PAGE_LIMIT = 500

const LEVEL_TAGS: Record<LogLevel, string> = { debug: 'DEBUG', info: 'INFO ', warn: 'WARN ', error: 'ERROR' }

function formatTime(time: number) {
  const date = new Date(time)
  const pad = (value: number, size = 2) => String(value).padStart(size, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
}

/** One readable line per entry (plus indented details) for the exported file */
export function formatLogEntry(entry: LogEntry) {
  const data = Object.entries(entry.data ?? {}).filter(([, value]) => value != null && value !== '').map(([key, value]) => `${key}=${value}`)
  const head = `${formatTime(entry.time)} ${LEVEL_TAGS[entry.level]} [${entry.category}]${entry.ref ? ` (${entry.ref})` : ''} ${entry.message}${data.length ? `  ${data.join(' ')}` : ''}`
  return entry.detail ? `${head}\n${entry.detail.split('\n').map(line => `    ${line}`).join('\n')}` : head
}

/**
 * Operation log shown on the logs page. Every `createLogger` entry ends up here:
 * kept in memory for queries, appended to a JSON lines file, and pushed to clients.
 */
export class LogService {
  private entries: LogEntry[] = []
  private seq = 0
  private unwritten: string[] = []
  private unsent: LogEntry[] = []
  private writeTimer?: NodeJS.Timeout
  private emitTimer?: NodeJS.Timeout
  private writing: Promise<void> = Promise.resolve()
  private size = 0

  constructor(private readonly dataDir: string, private readonly bus: EventBus) {}

  private get dir() {
    return path.join(this.dataDir, 'logs')
  }

  get file() {
    return path.join(this.dir, 'app.jsonl')
  }

  private get backup() {
    return path.join(this.dir, 'app.1.jsonl')
  }

  async init() {
    await ensureDir(this.dir)
    const restored: LogEntry[] = []
    for (const file of [this.backup, this.file]) {
      const content = await fs.readFile(file, 'utf8').catch(() => '')
      if (file === this.file)
        this.size = Buffer.byteLength(content)
      for (const line of content.split('\n')) {
        if (!line.trim())
          continue
        try {
          restored.push(JSON.parse(line) as LogEntry)
        }
        catch {}
      }
    }
    this.entries = restored.slice(-MAX_ENTRIES)
    this.seq = this.entries.at(-1)?.id ?? 0
    setLogSink(record => this.add(record))
  }

  add(record: LogRecord) {
    const entry: LogEntry = { id: ++this.seq, ...record }
    this.entries.push(entry)
    // Trim in batches, splicing a 5000 items array on every entry is wasteful
    if (this.entries.length > MAX_ENTRIES * 1.2)
      this.entries.splice(0, this.entries.length - MAX_ENTRIES)
    this.unwritten.push(JSON.stringify(entry))
    this.writeTimer ??= setTimeout(() => void this.flush(), WRITE_DELAY)
    this.unsent.push(entry)
    this.emitTimer ??= setTimeout(() => this.emit(), EMIT_INTERVAL)
    return entry
  }

  query({ before, limit = 200, ...filter }: LogQuery = {}): LogPage {
    const max = Math.min(Math.max(1, limit), PAGE_LIMIT)
    const result: LogEntry[] = []
    for (let index = this.entries.length - 1; index >= 0; index--) {
      const entry = this.entries[index]
      if (before && entry.id >= before)
        continue
      if (!matchesLogQuery(entry, filter))
        continue
      if (result.length === max)
        return { entries: result, hasMore: true }
      result.push(entry)
    }
    return { entries: result, hasMore: false }
  }

  /** Every matching entry still in memory as plain text, oldest first */
  export(filter: Omit<LogQuery, 'before' | 'limit'> = {}) {
    return this.entries.filter(entry => matchesLogQuery(entry, filter)).map(formatLogEntry).join('\n')
  }

  async clear() {
    this.entries = []
    this.unwritten = []
    this.unsent = []
    await this.writing
    await Promise.all([this.file, this.backup].map(file => fs.rm(file, { force: true })))
    this.size = 0
    // Ids keep increasing so clients never confuse old and new entries
    this.bus.emit({ type: 'log:cleared' })
  }

  async flush() {
    if (this.writeTimer)
      clearTimeout(this.writeTimer)
    this.writeTimer = undefined
    if (!this.unwritten.length)
      return this.writing
    const chunk = `${this.unwritten.join('\n')}\n`
    this.unwritten = []
    this.writing = this.writing.then(async () => {
      await fs.appendFile(this.file, chunk)
      this.size += Buffer.byteLength(chunk)
      if (this.size > MAX_FILE_SIZE) {
        await fs.rename(this.file, this.backup)
        this.size = 0
      }
    }).catch((error) => {
      // Not through the logger, that would feed this very file
      console.error('Failed to write the log file', error)
    })
    return this.writing
  }

  async shutdown() {
    setLogSink(null)
    if (this.emitTimer)
      clearTimeout(this.emitTimer)
    await this.flush()
  }

  private emit() {
    this.emitTimer = undefined
    if (!this.unsent.length)
      return
    const entries = this.unsent
    this.unsent = []
    this.bus.emit({ type: 'log:added', entries })
  }
}
