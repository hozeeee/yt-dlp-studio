export type LibraryEntryType = 'directory' | 'video' | 'audio' | 'image' | 'subtitle' | 'other'

export interface LibraryEntry {
  name: string
  /** Path relative to the download directory, always using `/` */
  path: string
  type: LibraryEntryType
  size: number
  mtime: number
  /** Number of children for directories */
  children?: number
  /** Cover of a video / audio file: a same-named image next to it, relative to the download directory */
  thumbnailPath?: string
  /** Cover of a video / audio file: the remote thumbnail of the task that downloaded it, when there is no local one */
  thumbnailUrl?: string
}

export interface LibraryListing {
  path: string
  entries: LibraryEntry[]
}

export interface BinaryInfo {
  path: string
  version: string
  /** Installed and maintained by yt-dlp Studio */
  managed?: boolean
}

export type BinaryName = 'ytdlp' | 'ffmpeg'
export type BinaryJobAction = 'install' | 'update'
export type BinaryJobStatus = 'running' | 'success' | 'error' | 'cancelled'
export type BinaryJobPhase = 'preparing' | 'downloading' | 'extracting' | 'verifying' | 'updating' | 'done'

/** A background install / update of a managed binary */
export interface BinaryJob {
  id: string
  binary: BinaryName
  action: BinaryJobAction
  status: BinaryJobStatus
  phase: BinaryJobPhase
  /** File currently being downloaded */
  file?: string
  /** 1-based index of the current download when several files are needed */
  step: number
  steps: number
  downloaded: number
  total?: number
  /** Bytes per second */
  speed?: number
  startedAt: number
  finishedAt?: number
  version?: string
  error?: string
  log: string[]
}

export interface BinaryStatus {
  info: BinaryInfo | null
  /** A prebuilt release is available for this platform */
  installable: boolean
  job: BinaryJob | null
}

export interface CookieFile {
  id: string
  /** Original file name */
  name: string
  domains: string[]
  count: number
  /** Cookies already expired at upload time */
  expired: number
  size: number
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export interface SystemInfo {
  version: string
  node: string
  platform: string
  arch: string
  ytdlp: BinaryInfo | null
  ffmpeg: BinaryInfo | null
  binaries: Record<BinaryName, BinaryStatus>
  downloadDir: string
  dataDir: string
  disk?: { free: number, total: number }
  /** Whether a merged cookies.txt is available for yt-dlp */
  cookiesFile: boolean
  /** Whether the server is running inside a container */
  container: boolean
}
