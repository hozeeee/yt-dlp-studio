export interface MediaFormat {
  id: string
  ext: string
  note?: string
  resolution?: string
  width?: number
  height?: number
  fps?: number
  vcodec?: string
  acodec?: string
  filesize?: number
  tbr?: number
  hasVideo: boolean
  hasAudio: boolean
}

export interface PlaylistEntry {
  id?: string
  url: string
  title?: string
  thumbnail?: string
  uploader?: string
  duration?: number
}

export interface MediaInfo {
  type: 'video' | 'playlist'
  id?: string
  url: string
  title: string
  description?: string
  thumbnail?: string
  uploader?: string
  uploaderUrl?: string
  duration?: number
  uploadDate?: string
  viewCount?: number
  extractor?: string
  formats: MediaFormat[]
  subtitles: string[]
  autoCaptions: string[]
  chapters: number
  entries?: PlaylistEntry[]
  playlistCount?: number
}
