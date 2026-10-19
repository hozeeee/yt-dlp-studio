import type { MediaFormat, MediaInfo, PlaylistEntry } from '@yt-dlp-studio/shared'

interface RawFormat {
  format_id?: string
  ext?: string
  format_note?: string
  resolution?: string
  width?: number
  height?: number
  fps?: number
  vcodec?: string
  acodec?: string
  filesize?: number
  filesize_approx?: number
  tbr?: number
}

interface RawInfo {
  _type?: string
  id?: string
  original_url?: string
  webpage_url?: string
  url?: string
  title?: string
  description?: string
  thumbnail?: string
  uploader?: string
  uploader_url?: string
  channel?: string
  channel_url?: string
  duration?: number
  upload_date?: string
  timestamp?: number
  view_count?: number
  extractor_key?: string
  extractor?: string
  formats?: RawFormat[]
  subtitles?: Record<string, unknown>
  automatic_captions?: Record<string, unknown>
  chapters?: unknown[]
  entries?: RawInfo[]
  playlist_count?: number
}

function mapFormat(raw: RawFormat): MediaFormat {
  return {
    id: raw.format_id ?? '?',
    ext: raw.ext ?? '?',
    note: raw.format_note,
    resolution: raw.resolution,
    width: raw.width,
    height: raw.height,
    fps: raw.fps,
    vcodec: raw.vcodec,
    acodec: raw.acodec,
    filesize: raw.filesize ?? raw.filesize_approx,
    tbr: raw.tbr,
    hasVideo: Boolean(raw.vcodec && raw.vcodec !== 'none'),
    hasAudio: Boolean(raw.acodec && raw.acodec !== 'none'),
  }
}

function entryUrl(entry: RawInfo) {
  if (entry.webpage_url)
    return entry.webpage_url
  if (entry.original_url)
    return entry.original_url
  if (entry.url?.startsWith('http'))
    return entry.url
  // Flat playlist entries often have an id and url which may not be a URL.
  // This YouTube fallback is intentionally last; other extractors usually expose webpage_url.
  if (entry.id && /youtube/i.test(entry.extractor_key ?? entry.extractor ?? ''))
    return `https://www.youtube.com/watch?v=${entry.id}`
  return entry.url ?? entry.id ?? ''
}

function mapEntry(entry: RawInfo): PlaylistEntry | null {
  const url = entryUrl(entry)
  if (!url)
    return null
  return {
    id: entry.id,
    url,
    title: entry.title,
    thumbnail: entry.thumbnail,
    uploader: entry.uploader ?? entry.channel,
    duration: entry.duration,
  }
}

export function normalizeInfo(raw: RawInfo, requestedUrl: string): MediaInfo {
  const entries = raw.entries?.map(mapEntry).filter((item): item is PlaylistEntry => Boolean(item))
  const isPlaylist = Boolean(entries) || ['playlist', 'multi_video'].includes(raw._type ?? '')
  return {
    type: isPlaylist ? 'playlist' : 'video',
    id: raw.id,
    url: raw.webpage_url ?? raw.original_url ?? requestedUrl,
    title: raw.title ?? 'Untitled',
    description: raw.description,
    thumbnail: raw.thumbnail,
    uploader: raw.uploader ?? raw.channel,
    uploaderUrl: raw.uploader_url ?? raw.channel_url,
    duration: raw.duration,
    uploadDate: raw.upload_date,
    viewCount: raw.view_count,
    extractor: raw.extractor_key ?? raw.extractor,
    formats: (raw.formats ?? []).map(mapFormat),
    subtitles: Object.keys(raw.subtitles ?? {}),
    autoCaptions: Object.keys(raw.automatic_captions ?? {}),
    chapters: raw.chapters?.length ?? 0,
    entries,
    playlistCount: raw.playlist_count ?? entries?.length,
  }
}

/** yt-dlp may print warnings before JSON; locate the last parseable JSON line */
export function parseJsonOutput(output: string): RawInfo {
  const lines = output.trim().split(/\r?\n/)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (!line.startsWith('{') && !line.startsWith('['))
      continue
    try {
      return JSON.parse(line) as RawInfo
    }
    catch {}
  }
  // Normal pretty JSON or output with embedded newlines
  const start = output.indexOf('{')
  const end = output.lastIndexOf('}')
  if (start >= 0 && end > start)
    return JSON.parse(output.slice(start, end + 1)) as RawInfo
  throw new Error('yt-dlp did not return valid media information')
}
