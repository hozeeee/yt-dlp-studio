import type { AppSettings } from '@yt-dlp-studio/shared'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { parseArgs } from 'node:util'

declare const __APP_VERSION__: string | undefined

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev'

export interface ServerConfig {
  /** Addresses to listen on. `::` listens on both IPv6 and IPv4 when the OS supports dual-stack. */
  hosts: string[]
  port: number
  /** Public base path, e.g. `/` or `/ytdlp/`. Always starts and ends with `/`. */
  basePath: string
  /** Where settings, task history and managed binaries are stored */
  dataDir: string
  /** Directory with the built web assets, overrides the embedded / bundled assets */
  webDir?: string
  /** Access password, configured by environment */
  password?: string
  /** Settings fixed by environment variables / CLI */
  overrides: Partial<AppSettings>
  /** Running inside a container (Docker etc.) */
  container: boolean
  logLevel: string
}

const HELP = `
yt-dlp Studio v${APP_VERSION}

Usage: yt-dlp-studio [options]

Options:
  -H, --host <addr>        Listen address, comma separated (env: HOST, default: ::)
  -p, --port <port>        Listen port (env: PORT, default: 8686)
  -d, --data-dir <dir>     Data directory (env: DATA_DIR, default: ./data)
  -o, --download-dir <dir> Download directory (env: DOWNLOAD_DIR, default: ./downloads)
      --base-path <path>   Serve under a sub path, e.g. /ytdlp (env: BASE_PATH)
      --password <pwd>     Require a password to access the UI (env: AUTH_PASSWORD)
      --ytdlp <path>       Path of the yt-dlp binary (env: YTDLP_PATH)
      --ffmpeg <path>      Path of the ffmpeg binary (env: FFMPEG_PATH)
      --web-dir <dir>      Serve web assets from this directory (env: WEB_DIR)
      --log-level <level>  debug | info | warn | error (env: LOG_LEVEL)
  -v, --version            Print version
  -h, --help               Print this help
`

function normalizeBasePath(input?: string) {
  if (!input)
    return '/'
  let value = input.trim()
  if (!value.startsWith('/'))
    value = `/${value}`
  if (!value.endsWith('/'))
    value = `${value}/`
  return value.replace(/\/{2,}/g, '/')
}

function toInt(value: string | undefined) {
  if (value == null || value === '')
    return undefined
  const num = Number.parseInt(value, 10)
  return Number.isFinite(num) ? num : undefined
}

function detectContainer() {
  if (process.env.YTDLP_STUDIO_CONTAINER)
    return process.env.YTDLP_STUDIO_CONTAINER !== 'false'
  return existsSync('/.dockerenv') || existsSync('/run/.containerenv')
}

export function loadConfig(argv = process.argv.slice(2)): ServerConfig {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: false,
    options: {
      'host': { type: 'string', short: 'H' },
      'port': { type: 'string', short: 'p' },
      'data-dir': { type: 'string', short: 'd' },
      'download-dir': { type: 'string', short: 'o' },
      'base-path': { type: 'string' },
      'password': { type: 'string' },
      'ytdlp': { type: 'string' },
      'ffmpeg': { type: 'string' },
      'web-dir': { type: 'string' },
      'log-level': { type: 'string' },
      'version': { type: 'boolean', short: 'v' },
      'help': { type: 'boolean', short: 'h' },
    },
  })
  const arg = (name: string) => {
    const value = values[name]
    return typeof value === 'string' ? value : undefined
  }
  const env = process.env

  if (values.help) {
    console.log(HELP)
    process.exit(0)
  }
  if (values.version) {
    console.log(APP_VERSION)
    process.exit(0)
  }

  const hostInput = arg('host') ?? env.HOST ?? '::'
  const hosts = hostInput.split(',').map(h => h.trim().replace(/^\[|\]$/g, '')).filter(Boolean)

  const overrides: Partial<AppSettings> = {}
  const downloadDir = arg('download-dir') ?? env.DOWNLOAD_DIR
  if (downloadDir)
    overrides.downloadDir = path.resolve(downloadDir)
  const ytdlpPath = arg('ytdlp') ?? env.YTDLP_PATH
  if (ytdlpPath)
    overrides.ytdlpPath = ytdlpPath
  const ffmpegPath = arg('ffmpeg') ?? env.FFMPEG_PATH
  if (ffmpegPath)
    overrides.ffmpegPath = ffmpegPath
  const maxConcurrent = toInt(env.MAX_CONCURRENT)
  if (maxConcurrent)
    overrides.maxConcurrent = maxConcurrent
  if (env.ALLOW_CUSTOM_ARGS)
    overrides.allowCustomArgs = env.ALLOW_CUSTOM_ARGS === 'true'

  const webDir = arg('web-dir') ?? env.WEB_DIR

  return {
    hosts: hosts.length ? hosts : ['::'],
    port: toInt(arg('port') ?? env.PORT) ?? 8686,
    basePath: normalizeBasePath(arg('base-path') ?? env.BASE_PATH ?? env.URL_PREFIX),
    dataDir: path.resolve(arg('data-dir') ?? env.DATA_DIR ?? 'data'),
    webDir: webDir ? path.resolve(webDir) : undefined,
    password: arg('password') ?? env.AUTH_PASSWORD ?? undefined,
    overrides,
    container: detectContainer(),
    logLevel: arg('log-level') ?? env.LOG_LEVEL ?? 'info',
  }
}
