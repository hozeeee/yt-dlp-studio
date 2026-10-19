import type { DownloadOptions } from './task'

export type CookiesMode = 'none' | 'file' | 'browser'

export type DeleteFilesMode = 'never' | 'always' | 'ask'

export interface AppSettings {
  /** Absolute path, or relative to the working directory */
  downloadDir: string
  outputTemplate: string
  outputTemplatePlaylist: string
  maxConcurrent: number
  defaultOptions: DownloadOptions
  /** Record downloaded ids and skip them next time (`--download-archive`) */
  useArchive: boolean
  /** Hours before finished tasks are removed from the list, 0 = never */
  autoClearHours: number
  deleteFiles: DeleteFilesMode

  proxy: string
  rateLimit: string
  retries: number
  concurrentFragments: number
  cookiesMode: CookiesMode
  cookiesBrowser: string
  userAgent: string

  ytdlpPath: string
  ffmpegPath: string
  /** Prefix for GitHub download urls, useful in regions with poor connectivity */
  githubMirror: string
  /** Extra args appended to every yt-dlp invocation */
  globalArgs: string
  /** Allow per-download custom args. Only enable for trusted users. */
  allowCustomArgs: boolean

  subscriptionInterval: number
  subscriptionScanLimit: number
}

/** Settings as exposed to the client */
export interface PublicSettings extends AppSettings {
  /** Keys that are fixed by environment variables / CLI and cannot be changed */
  locked: (keyof AppSettings)[]
  authEnabled: boolean
}

export type SettingsUpdate = Partial<Omit<AppSettings, 'defaultOptions'>> & {
  defaultOptions?: Partial<DownloadOptions>
}
