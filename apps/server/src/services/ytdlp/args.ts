import type { AppSettings, DownloadOptions, TaskPlaylistInfo } from '@yt-dlp-studio/shared'
import { splitArgs } from '../../utils/process'

export const MARK_PROGRESS = '@@YTDS:P@@'
export const MARK_POSTPROCESS = '@@YTDS:PP@@'
export const MARK_INFO = '@@YTDS:I@@'
export const MARK_FILE = '@@YTDS:F@@'

const PROGRESS_TEMPLATE = [
  'progress.status',
  'progress.downloaded_bytes',
  'progress.total_bytes',
  'progress.total_bytes_estimate',
  'progress.speed',
  'progress.eta',
  'info.format_id',
].map(field => `%(${field})s`).join('|')

const INFO_FIELDS = 'id,title,thumbnail,uploader,channel,duration,extractor_key,webpage_url,format_id'

export interface CommonArgsContext {
  settings: AppSettings
  cookiesFile?: string
  ffmpegPath?: string
}

/** Args shared by info extraction and downloads (network, auth, binaries) */
export function buildCommonArgs({ settings, cookiesFile, ffmpegPath }: CommonArgsContext) {
  const args: string[] = []
  if (settings.proxy)
    args.push('--proxy', settings.proxy)
  if (settings.userAgent)
    args.push('--user-agent', settings.userAgent)
  if (settings.cookiesMode === 'file' && cookiesFile)
    args.push('--cookies', cookiesFile)
  else if (settings.cookiesMode === 'browser' && settings.cookiesBrowser)
    args.push('--cookies-from-browser', settings.cookiesBrowser)
  if (ffmpegPath && ffmpegPath !== 'ffmpeg')
    args.push('--ffmpeg-location', ffmpegPath)
  if (settings.globalArgs)
    args.push(...splitArgs(settings.globalArgs))
  return args
}

const CODEC_SORT: Record<string, string> = {
  h264: 'vcodec:h264',
  h265: 'vcodec:h265',
  av1: 'vcodec:av01',
  vp9: 'vcodec:vp9',
}

/** Translate the friendly options into yt-dlp format selection args */
export function buildFormatArgs(options: DownloadOptions) {
  const args: string[] = []
  if (options.kind === 'thumbnail') {
    args.push('--skip-download', '--write-thumbnail', '--convert-thumbnails', 'jpg')
    return args
  }

  if (options.kind === 'audio') {
    args.push('-f', options.format || 'ba/b', '-x', '--audio-quality', '0')
    if (options.audioFormat !== 'best')
      args.push('--audio-format', options.audioFormat)
    return args
  }

  const sort: string[] = []
  if (!options.format && options.quality !== 'best')
    sort.push(`res:${options.quality}`)
  if (options.codec !== 'auto')
    sort.push(CODEC_SORT[options.codec])
  if (options.container === 'mp4')
    sort.push('ext:mp4:m4a')
  else if (options.container === 'webm')
    sort.push('ext:webm:webm')

  args.push('-f', options.format || 'bv*+ba/b')
  if (sort.length)
    args.push('-S', sort.join(','))
  if (options.container !== 'auto') {
    args.push('--merge-output-format', options.container)
    if (options.container !== 'webm')
      args.push('--remux-video', options.container)
  }
  return args
}

function escapeTemplateValue(value: string) {
  return value.replace(/%/g, '%%')
}

function sanitizeName(value: string) {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[/\\:*?"<>|\x00-\x1F]/g, '_').trim() || 'Playlist'
}

/**
 * Tasks created from playlists are downloaded one by one with the entry url,
 * so the playlist fields are not known by yt-dlp. Substitute them beforehand.
 */
export function applyPlaylistTemplate(template: string, playlist?: TaskPlaylistInfo) {
  const values: Record<string, string | number | undefined> = {
    playlist: playlist?.title,
    playlist_title: playlist?.title,
    playlist_id: playlist?.id,
    playlist_index: playlist?.index,
    playlist_count: playlist?.count,
    playlist_autonumber: playlist?.index,
  }
  return template.replace(
    /%\((playlist(?:_title|_id|_index|_count|_autonumber)?)(?:[|&][^)]*)?\)(0?)(\d*)([ds])/g,
    (_, field: string, zero: string, width: string, type: string) => {
      const value = values[field]
      if (value == null || value === '')
        return 'NA'
      if (type === 'd' && typeof value === 'number') {
        const text = String(value)
        return width ? text.padStart(Number(width), zero ? '0' : ' ') : text
      }
      return escapeTemplateValue(sanitizeName(String(value)))
    },
  )
}

export interface DownloadArgsContext extends CommonArgsContext {
  url: string
  options: DownloadOptions
  outputDir: string
  playlist?: TaskPlaylistInfo
  archiveFile?: string
}

export function buildDownloadArgs(ctx: DownloadArgsContext) {
  const { settings, options } = ctx
  const template = options.outputTemplate
    || (ctx.playlist && settings.outputTemplatePlaylist ? settings.outputTemplatePlaylist : settings.outputTemplate)

  const args = [
    '--newline',
    '--no-colors',
    '--no-quiet',
    '--progress',
    '--no-simulate',
    '--no-playlist',
    '--no-mtime',
    '--progress-template',
    `download:${MARK_PROGRESS}${PROGRESS_TEMPLATE}`,
    '--progress-template',
    `postprocess:${MARK_POSTPROCESS}%(progress.status)s|%(progress.postprocessor)s`,
    '--print',
    `before_dl:${MARK_INFO}%(.{${INFO_FIELDS}})j`,
    '--print',
    `after_move:${MARK_FILE}%(filepath)s`,
    '-P',
    ctx.outputDir,
    '-o',
    applyPlaylistTemplate(template, ctx.playlist),
    '--retries',
    String(settings.retries),
    '--fragment-retries',
    String(settings.retries),
  ]

  if (settings.concurrentFragments > 1)
    args.push('--concurrent-fragments', String(settings.concurrentFragments))
  if (settings.rateLimit)
    args.push('--limit-rate', settings.rateLimit)
  if (ctx.archiveFile)
    args.push('--download-archive', ctx.archiveFile)

  args.push(...buildFormatArgs(options))

  if (options.kind !== 'thumbnail') {
    if (options.subtitles) {
      args.push('--write-subs', '--write-auto-subs', '--sub-langs', options.subtitleLangs || 'all')
      if (options.embedSubtitles && options.kind === 'video')
        args.push('--embed-subs')
    }
    if (options.embedThumbnail)
      args.push('--embed-thumbnail')
    if (options.writeThumbnail)
      args.push('--write-thumbnail')
    if (options.embedMetadata)
      args.push('--embed-metadata')
    if (options.embedChapters)
      args.push('--embed-chapters')
    if (options.splitChapters)
      args.push('--split-chapters', '-o', 'chapter:%(title)s/%(section_number)02d - %(section_title)s.%(ext)s')
    if (options.sponsorBlock)
      args.push('--sponsorblock-remove', 'sponsor,selfpromo,interaction')
    if (options.section)
      args.push('--download-sections', `*${options.section}`)
  }

  args.push(...buildCommonArgs(ctx))
  if (settings.allowCustomArgs && options.extraArgs)
    args.push(...splitArgs(options.extraArgs))

  args.push('--', ctx.url)
  return args
}
