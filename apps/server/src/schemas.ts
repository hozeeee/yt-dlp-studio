import type { LogCategory, LogLevel } from '@yt-dlp-studio/shared'
import { DEFAULT_DOWNLOAD_OPTIONS, LOG_CATEGORIES, LOG_LEVELS } from '@yt-dlp-studio/shared'
import { z } from 'zod'

const optionalText = (max = 2000) => z.string().trim().max(max).optional()

export const downloadOptionsSchema = z.object({
  kind: z.enum(['video', 'audio', 'thumbnail']),
  quality: z.enum(['best', '2160', '1440', '1080', '720', '480', '360', '240']),
  container: z.enum(['auto', 'mp4', 'mkv', 'webm']),
  codec: z.enum(['auto', 'h264', 'h265', 'av1', 'vp9']),
  audioFormat: z.enum(['best', 'mp3', 'm4a', 'opus', 'flac', 'wav']),
  format: optionalText(500),
  folder: optionalText(500),
  outputTemplate: optionalText(500),
  section: optionalText(200),
  subtitles: z.boolean(),
  subtitleLangs: z.string().trim().max(200),
  embedSubtitles: z.boolean(),
  embedThumbnail: z.boolean(),
  embedMetadata: z.boolean(),
  embedChapters: z.boolean(),
  writeThumbnail: z.boolean(),
  splitChapters: z.boolean(),
  sponsorBlock: z.boolean(),
  playlistLimit: z.number().int().min(0).max(100000),
  cookies: optionalText(100),
  extraArgs: optionalText(),
})

export const partialDownloadOptionsSchema = downloadOptionsSchema.partial()

export const settingsUpdateSchema = z.object({
  downloadDir: z.string().trim().min(1).max(1000),
  outputTemplate: z.string().trim().min(1).max(500),
  outputTemplatePlaylist: z.string().trim().max(500),
  maxConcurrent: z.number().int().min(1).max(20),
  defaultOptions: partialDownloadOptionsSchema,
  useArchive: z.boolean(),
  autoClearHours: z.number().min(0).max(24 * 365),
  deleteFiles: z.enum(['never', 'always', 'ask']),
  proxy: z.string().trim().max(500),
  rateLimit: z.string().trim().regex(/^(?:\d+(?:\.\d+)?[KMG]?)?$/i, 'Invalid rate limit, e.g. 2M or 500K'),
  retries: z.number().int().min(0).max(1000),
  concurrentFragments: z.number().int().min(1).max(32),
  cookiesMode: z.enum(['none', 'file', 'browser']),
  cookiesBrowser: z.string().trim().max(200),
  userAgent: z.string().trim().max(1000),
  ytdlpPath: z.string().trim().max(1000),
  ffmpegPath: z.string().trim().max(1000),
  githubMirror: z.string().trim().max(500),
  globalArgs: z.string().trim().max(5000),
  allowCustomArgs: z.boolean(),
  subscriptionInterval: z.number().int().min(5).max(60 * 24 * 30),
  subscriptionScanLimit: z.number().int().min(1).max(1000),
}).partial()

const urlSchema = z.string().trim().min(1).max(4000)

const playlistInfoSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  index: z.number().optional(),
  count: z.number().optional(),
})

export const addDownloadsSchema = z.object({
  urls: z.array(urlSchema).max(1000).optional(),
  entries: z.array(z.object({
    url: urlSchema,
    title: z.string().optional(),
    thumbnail: z.string().optional(),
    uploader: z.string().optional(),
    duration: z.number().optional(),
    playlist: playlistInfoSchema.optional(),
  })).max(5000).optional(),
  options: partialDownloadOptionsSchema.optional(),
  noPlaylist: z.boolean().optional(),
})

export const infoRequestSchema = z.object({
  url: urlSchema,
  /** Fetch playlist entries flat (fast) */
  flat: z.boolean().optional(),
  /** Same as `DownloadOptions.cookies` */
  cookies: optionalText(100),
})

export const createSubscriptionSchema = z.object({
  url: urlSchema,
  interval: z.number().int().min(5).max(60 * 24 * 30).optional(),
  options: partialDownloadOptionsSchema.optional(),
  downloadExisting: z.boolean().optional(),
})

export const updateSubscriptionSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  enabled: z.boolean().optional(),
  interval: z.number().int().min(5).max(60 * 24 * 30).optional(),
  options: partialDownloadOptionsSchema.optional(),
})

export const idsSchema = z.object({
  ids: z.array(z.string()).max(10000),
  deleteFiles: z.boolean().optional(),
})

export const taskActionSchema = z.object({
  ids: z.array(z.string()).max(10000),
  action: z.enum(['pause', 'resume', 'retry', 'cancel']),
})

export const loginSchema = z.object({
  password: z.string().max(500),
})

export const passwordSchema = z.object({
  current: z.string().max(500).optional(),
  password: z.string().max(500),
})

export const binaryParamSchema = z.object({
  name: z.enum(['ytdlp', 'ffmpeg']),
  action: z.enum(['install', 'update']),
})

export const uploadCookieSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.string().max(10 * 1024 * 1024),
})

export const updateCookieSchema = z.object({
  enabled: z.boolean(),
})

/** Query string of the logs endpoints, empty values mean "any" */
export const logQuerySchema = z.object({
  level: z.enum(LOG_LEVELS as [LogLevel, ...LogLevel[]]).optional().catch(undefined),
  category: z.enum(LOG_CATEGORIES as [LogCategory, ...LogCategory[]]).optional().catch(undefined),
  search: z.string().max(200).optional(),
  before: z.coerce.number().int().positive().optional().catch(undefined),
  limit: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
})

export function mergeDownloadOptions(...parts: (Partial<typeof DEFAULT_DOWNLOAD_OPTIONS> | undefined)[]) {
  const result = { ...DEFAULT_DOWNLOAD_OPTIONS }
  for (const part of parts) {
    if (!part)
      continue
    for (const [key, value] of Object.entries(part)) {
      if (value !== undefined)
        (result as Record<string, unknown>)[key] = value
    }
  }
  return result
}
