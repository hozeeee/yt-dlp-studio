export type TaskStatus
  = | 'queued'
    | 'downloading'
    | 'processing'
    | 'paused'
    | 'completed'
    | 'failed'
    | 'canceled'

export const ACTIVE_STATUSES: TaskStatus[] = ['queued', 'downloading', 'processing', 'paused']
export const FINISHED_STATUSES: TaskStatus[] = ['completed', 'failed', 'canceled']

/** What kind of output a download produces */
export type DownloadKind = 'video' | 'audio' | 'thumbnail'

/** Max video height, `best` means no limit */
export type VideoQuality = 'best' | '2160' | '1440' | '1080' | '720' | '480' | '360' | '240'

export type VideoContainer = 'auto' | 'mp4' | 'mkv' | 'webm'

export type VideoCodec = 'auto' | 'h264' | 'h265' | 'av1' | 'vp9'

export type AudioFormat = 'best' | 'mp3' | 'm4a' | 'opus' | 'flac' | 'wav'

/** `DownloadOptions.cookies` value that disables cookies for a download */
export const COOKIES_NONE = 'none'

export interface DownloadOptions {
  kind: DownloadKind
  quality: VideoQuality
  container: VideoContainer
  codec: VideoCodec
  audioFormat: AudioFormat
  /** Raw yt-dlp format selector (`-f`), overrides quality/container/codec when set */
  format?: string
  /** Sub folder relative to the download directory */
  folder?: string
  /** Output template, falls back to settings when empty */
  outputTemplate?: string
  /** Download only a section of the media, e.g. `00:01:00-00:02:30` */
  section?: string
  subtitles: boolean
  subtitleLangs: string
  embedSubtitles: boolean
  embedThumbnail: boolean
  embedMetadata: boolean
  embedChapters: boolean
  writeThumbnail: boolean
  splitChapters: boolean
  sponsorBlock: boolean
  /** Only used when the URL points to a playlist, 0 = all */
  playlistLimit: number
  /**
   * Cookies used by this download: empty follows the global settings,
   * `none` disables cookies, otherwise the id of an uploaded cookies file
   */
  cookies?: string
  /** Extra raw command line args, only honored when allowed by settings */
  extraArgs?: string
}

export interface TaskProgress {
  percent: number
  downloaded: number
  total: number | null
  speed: number | null
  eta: number | null
  /** Current yt-dlp stage description, e.g. `Merger` */
  stage?: string
}

export interface TaskPlaylistInfo {
  id?: string
  title?: string
  index?: number
  count?: number
}

export interface DownloadTask {
  id: string
  url: string
  title: string
  thumbnail?: string
  uploader?: string
  duration?: number
  extractor?: string
  status: TaskStatus
  progress: TaskProgress
  options: DownloadOptions
  /** Output files, relative to the download directory */
  files: string[]
  /** Total size on disk of output files */
  size?: number
  error?: string
  playlist?: TaskPlaylistInfo
  subscriptionId?: string
  createdAt: number
  startedAt?: number
  finishedAt?: number
}

/** Light-weight entry used when adding tasks from analyzed info */
export interface DownloadEntry {
  url: string
  title?: string
  thumbnail?: string
  uploader?: string
  duration?: number
  playlist?: TaskPlaylistInfo
}

export interface AddDownloadsRequest {
  /** Raw urls, the server will resolve playlists */
  urls?: string[]
  /** Already resolved entries, will be queued as-is */
  entries?: DownloadEntry[]
  options?: Partial<DownloadOptions>
  /** Skip playlist expansion and download as a single task */
  noPlaylist?: boolean
}

export interface AddDownloadsResponse {
  tasks: DownloadTask[]
  errors: { url: string, error: string }[]
}

export type TaskAction = 'pause' | 'resume' | 'retry' | 'cancel'
