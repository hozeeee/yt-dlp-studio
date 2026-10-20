import type { DownloadTask, LibraryEntry, LibraryEntryType, LibraryListing } from '@yt-dlp-studio/shared'
import type { SettingsService } from './settings'
import fs from 'node:fs/promises'
import path from 'node:path'
import { resolveInside, toPosix } from '../utils/fs'
import { createLogger } from '../utils/logger'

const logger = createLogger('library')

const TYPES: Record<string, LibraryEntryType> = {
  '.mp4': 'video',
  '.mkv': 'video',
  '.webm': 'video',
  '.mov': 'video',
  '.avi': 'video',
  '.m4v': 'video',
  '.mp3': 'audio',
  '.m4a': 'audio',
  '.aac': 'audio',
  '.flac': 'audio',
  '.wav': 'audio',
  '.opus': 'audio',
  '.ogg': 'audio',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.webp': 'image',
  '.gif': 'image',
  '.vtt': 'subtitle',
  '.srt': 'subtitle',
  '.ass': 'subtitle',
  '.lrc': 'subtitle',
}

// Only media types are served with a real MIME type, anything else is an opaque download
const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.opus': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.vtt': 'text/vtt; charset=utf-8',
  '.srt': 'text/plain; charset=utf-8',
  '.ass': 'text/plain; charset=utf-8',
  '.lrc': 'text/plain; charset=utf-8',
}

export function mimeType(file: string) {
  return MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
}

const TYPE_ORDER: Record<LibraryEntryType, number> = {
  directory: 0,
  video: 1,
  audio: 2,
  image: 3,
  subtitle: 4,
  other: 5,
}

export class LibraryService {
  /** `tasks` is used to borrow the remote thumbnail of the task that produced a file */
  constructor(private readonly settings: SettingsService, private readonly tasks: () => DownloadTask[] = () => []) {}

  resolve(relative = '') {
    return resolveInside(this.settings.value.downloadDir, relative)
  }

  /** Remote thumbnail of the newest task that produced each file, keyed by library path */
  private remoteThumbnails() {
    const thumbnails = new Map<string, string>()
    for (const task of this.tasks()) {
      if (!task.thumbnail)
        continue
      for (const file of task.files) {
        if (!thumbnails.has(file))
          thumbnails.set(file, task.thumbnail)
      }
    }
    return thumbnails
  }

  async list(relative = ''): Promise<LibraryListing> {
    const dir = this.resolve(relative)
    if (!dir)
      throw new Error('Invalid library path')
    const items = await fs.readdir(dir, { withFileTypes: true })
    // `--write-thumbnail` saves the cover next to the media with the same name and an image extension
    const images = new Map<string, string>()
    for (const item of items) {
      const ext = path.extname(item.name).toLowerCase()
      if (item.isFile() && TYPES[ext] === 'image' && !item.name.startsWith('.'))
        images.set(path.basename(item.name, path.extname(item.name)), item.name)
    }
    const remote = this.remoteThumbnails()
    const entries = await Promise.all(items
      .filter(item => !item.name.startsWith('.') && !item.name.endsWith('.part') && !item.name.endsWith('.ytdl'))
      .map(async (item): Promise<LibraryEntry | null> => {
        const absolute = path.join(dir, item.name)
        let stat
        try {
          stat = await fs.stat(absolute)
        }
        catch {
          return null
        }
        const rel = toPosix(path.relative(this.settings.value.downloadDir, absolute))
        if (item.isDirectory()) {
          let children: number | undefined
          try {
            children = (await fs.readdir(absolute)).length
          }
          catch {}
          return { name: item.name, path: rel, type: 'directory', size: 0, mtime: stat.mtimeMs, children }
        }
        if (!item.isFile())
          return null
        const ext = path.extname(item.name)
        const type = TYPES[ext.toLowerCase()] ?? 'other'
        const entry: LibraryEntry = { name: item.name, path: rel, type, size: stat.size, mtime: stat.mtimeMs }
        if (type === 'video' || type === 'audio') {
          const image = images.get(path.basename(item.name, ext))
          if (image)
            entry.thumbnailPath = toPosix(path.join(path.dirname(rel), image))
          else
            entry.thumbnailUrl = remote.get(rel)
        }
        return entry
      }))
    return {
      path: toPosix(path.relative(this.settings.value.downloadDir, dir)),
      entries: entries
        .filter((item): item is LibraryEntry => Boolean(item))
        .sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.name.localeCompare(b.name, undefined, { numeric: true })),
    }
  }

  async remove(relative: string) {
    const target = this.resolve(relative)
    if (!target || target === this.settings.value.downloadDir)
      throw new Error('Invalid library path')
    await fs.rm(target, { recursive: true, force: true })
    logger.info(`Deleted ${relative}`)
  }

  async rename(relative: string, name: string) {
    if (!name || name === '.' || name === '..' || /[/\\]/.test(name))
      throw new Error('Invalid name')
    const source = this.resolve(relative)
    if (!source || source === this.settings.value.downloadDir)
      throw new Error('Invalid library path')
    const target = path.join(path.dirname(source), name)
    if (!this.resolve(toPosix(path.relative(this.settings.value.downloadDir, target))))
      throw new Error('Invalid destination')
    await fs.rename(source, target)
    const renamed = toPosix(path.relative(this.settings.value.downloadDir, target))
    logger.info(`Renamed ${relative} → ${renamed}`)
    return renamed
  }

  async mkdir(relative: string) {
    const dir = this.resolve(relative)
    if (!dir)
      throw new Error('Invalid library path')
    await fs.mkdir(dir, { recursive: true })
    logger.info(`Created folder ${relative}`)
  }
}
