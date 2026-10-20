/** Severity of a log entry, from the most verbose to the most severe */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error']

/** Which part of the app produced a log entry */
export type LogCategory
  = | 'preview'
    | 'download'
    | 'subscription'
    | 'library'
    | 'binary'
    | 'cookies'
    | 'auth'
    | 'system'

export const LOG_CATEGORIES: LogCategory[] = ['preview', 'download', 'subscription', 'library', 'binary', 'cookies', 'auth', 'system']

/** Small structured context attached to an entry, e.g. a url or a duration */
export type LogData = Record<string, string | number | boolean | null | undefined>

export interface LogEntry {
  /** Increasing sequence number */
  id: number
  time: number
  level: LogLevel
  category: LogCategory
  message: string
  /** Related task / subscription / job id */
  ref?: string
  /** Multi-line details, e.g. yt-dlp stderr, a command line or a stack trace */
  detail?: string
  data?: LogData
}

export interface LogQuery {
  /** Minimum level, entries below it are skipped */
  level?: LogLevel
  category?: LogCategory
  /** Case-insensitive text matched against message, details, ref and data */
  search?: string
  /** Only entries with a smaller id, used for paging back in time */
  before?: number
  limit?: number
}

export interface LogPage {
  /** Newest first */
  entries: LogEntry[]
  hasMore: boolean
}

/** Whether an entry passes a query, shared by the server and live updates in the UI */
export function matchesLogQuery(entry: LogEntry, query: Omit<LogQuery, 'before' | 'limit'>) {
  if (query.level && LOG_LEVELS.indexOf(entry.level) < LOG_LEVELS.indexOf(query.level))
    return false
  if (query.category && entry.category !== query.category)
    return false
  const search = query.search?.trim().toLowerCase()
  if (!search)
    return true
  const haystack = [entry.message, entry.detail, entry.ref, ...Object.values(entry.data ?? {})]
  return haystack.some(value => value != null && String(value).toLowerCase().includes(search))
}
