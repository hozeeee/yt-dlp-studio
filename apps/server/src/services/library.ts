import type { LibraryEntry, LibraryEntryType, LibraryListing } from '@yt-dlp-studio/shared'
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
  constructor(private readonly settings: SettingsService) {}

  resolve(relative = '') {
    return resolveInside(this.settings.value.downloadDir, relative)
  }

  async list(relative = ''): Promise<LibraryListing> {
    const dir = this.resolve(relative)
    if (!dir)
      throw new Error('Invalid library path')
    const items = await fs.readdir(dir, { withFileTypes: true })
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
        return {
          name: item.name,
          path: rel,
          type: TYPES[path.extname(item.name).toLowerCase()] ?? 'other',
          size: stat.size,
          mtime: stat.mtimeMs,
        }
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
