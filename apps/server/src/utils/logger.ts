import type { LogCategory, LogData, LogEntry, LogLevel } from '@yt-dlp-studio/shared'
import process from 'node:process'

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

const COLORS: Record<LogLevel, string> = {
  debug: '\x1B[90m',
  info: '\x1B[36m',
  warn: '\x1B[33m',
  error: '\x1B[31m',
}

const useColor = process.stdout.isTTY && !process.env.NO_COLOR

let threshold = LEVELS[(process.env.LOG_LEVEL?.toLowerCase() as LogLevel) ?? 'info'] ?? LEVELS.info

export function setLogLevel(level: string) {
  const value = LEVELS[level.toLowerCase() as LogLevel]
  if (value)
    threshold = value
}

export interface LogMeta {
  /** Related task / subscription / job id */
  ref?: string
  /** Extra text shown when the entry is expanded */
  detail?: string
  data?: LogData
  /** Appended to the details (message and stack) */
  error?: unknown
}

export type LogRecord = Omit<LogEntry, 'id'>
type LogSink = (record: LogRecord) => void

let sink: LogSink | null = null
/** Entries logged before the log service is ready (startup) */
const early: LogRecord[] = []

/** Route every entry to the persistent log, the console output stays as is */
export function setLogSink(next: LogSink | null) {
  sink = next
  if (next)
    early.splice(0).forEach(next)
}

function describeError(error: unknown) {
  if (error == null)
    return undefined
  if (error instanceof Error)
    return error.stack || error.message
  return String(error)
}

function write(level: LogLevel, category: LogCategory, message: string, meta?: LogMeta) {
  const detail = [meta?.detail, describeError(meta?.error)].filter(Boolean).join('\n') || undefined
  const record: LogRecord = { time: Date.now(), level, category, message, ref: meta?.ref, detail, data: meta?.data }
  if (sink)
    sink(record)
  else if (early.length < 500)
    early.push(record)

  if (LEVELS[level] < threshold)
    return
  const time = new Date(record.time).toISOString().replace('T', ' ').slice(0, 19)
  const tag = useColor ? `${COLORS[level]}${level.toUpperCase().padEnd(5)}\x1B[0m` : level.toUpperCase().padEnd(5)
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  const extra = meta?.error ?? (level === 'debug' && meta?.detail ? meta.detail : undefined)
  fn(`${time} ${tag} [${category}]${meta?.ref ? ` (${meta.ref})` : ''} ${message}`, ...(extra === undefined ? [] : [extra]))
}

/** Logger of one app area; the category is what the logs page filters on */
export function createLogger(category: LogCategory) {
  return {
    debug: (message: string, meta?: LogMeta) => write('debug', category, message, meta),
    info: (message: string, meta?: LogMeta) => write('info', category, message, meta),
    warn: (message: string, meta?: LogMeta) => write('warn', category, message, meta),
    error: (message: string, meta?: LogMeta) => write('error', category, message, meta),
  }
}

export type Logger = ReturnType<typeof createLogger>

/** Seconds with one decimal, for "took 3.2s" style messages */
export function elapsed(since: number) {
  return `${((Date.now() - since) / 1000).toFixed(1)}s`
}

const SECRET_FLAGS = new Set(['--password', '-p', '--video-password', '--ap-password', '--username', '-u', '--ap-username', '--twofactor', '-2', '--client-certificate-password'])

/** Shell-like command line for the logs, with credentials masked */
export function describeCommand(command: string, args: string[]) {
  const masked = args.map((arg, index) => {
    if (index > 0 && SECRET_FLAGS.has(args[index - 1]))
      return '***'
    // Credentials embedded in urls, e.g. `--proxy http://user:pass@host`
    return arg.replace(/\/\/[^/@\s]+@/g, '//***@')
  })
  return [command, ...masked].map(arg => /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`).join(' ')
}
