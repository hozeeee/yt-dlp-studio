import process from 'node:process'

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

const COLORS: Record<Level, string> = {
  debug: '\x1B[90m',
  info: '\x1B[36m',
  warn: '\x1B[33m',
  error: '\x1B[31m',
}

const useColor = process.stdout.isTTY && !process.env.NO_COLOR

let threshold = LEVELS[(process.env.LOG_LEVEL?.toLowerCase() as Level) ?? 'info'] ?? LEVELS.info

export function setLogLevel(level: string) {
  const value = LEVELS[level.toLowerCase() as Level]
  if (value)
    threshold = value
}

function write(level: Level, scope: string, args: unknown[]) {
  if (LEVELS[level] < threshold)
    return
  const time = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const tag = useColor ? `${COLORS[level]}${level.toUpperCase().padEnd(5)}\x1B[0m` : level.toUpperCase().padEnd(5)
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  fn(`${time} ${tag} [${scope}]`, ...args)
}

export function createLogger(scope: string) {
  return {
    debug: (...args: unknown[]) => write('debug', scope, args),
    info: (...args: unknown[]) => write('info', scope, args),
    warn: (...args: unknown[]) => write('warn', scope, args),
    error: (...args: unknown[]) => write('error', scope, args),
  }
}

export type Logger = ReturnType<typeof createLogger>
