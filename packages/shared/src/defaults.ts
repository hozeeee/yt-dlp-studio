import type { AppSettings } from './settings'
import type { DownloadOptions, VideoQuality } from './task'

export const APP_NAME = 'yt-dlp Studio'

export const VIDEO_QUALITIES: VideoQuality[] = ['best', '2160', '1440', '1080', '720', '480', '360', '240']

export const DEFAULT_DOWNLOAD_OPTIONS: DownloadOptions = {
  kind: 'video',
  quality: 'best',
  container: 'auto',
  codec: 'auto',
  audioFormat: 'mp3',
  subtitles: false,
  subtitleLangs: 'zh.*,en.*',
  embedSubtitles: true,
  embedThumbnail: false,
  embedMetadata: true,
  embedChapters: true,
  writeThumbnail: false,
  splitChapters: false,
  sponsorBlock: false,
  playlistLimit: 0,
}

export const DEFAULT_SETTINGS: AppSettings = {
  downloadDir: '',
  outputTemplate: '%(title)s [%(id)s].%(ext)s',
  outputTemplatePlaylist: '%(playlist_title)s/%(playlist_index)03d - %(title)s [%(id)s].%(ext)s',
  maxConcurrent: 3,
  defaultOptions: DEFAULT_DOWNLOAD_OPTIONS,
  useArchive: false,
  autoClearHours: 0,
  deleteFiles: 'ask',

  proxy: '',
  rateLimit: '',
  retries: 10,
  concurrentFragments: 1,
  cookiesMode: 'none',
  cookiesBrowser: 'chrome',
  userAgent: '',

  ytdlpPath: '',
  ffmpegPath: '',
  githubMirror: '',
  globalArgs: '',
  allowCustomArgs: false,

  subscriptionInterval: 60,
  subscriptionScanLimit: 30,
}
