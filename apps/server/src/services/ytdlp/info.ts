import type { MediaInfo } from '@yt-dlp-studio/shared'
import type { CookieService } from '../cookies'
import type { SettingsService } from '../settings'
import type { BinaryManager } from './binary'
import { execCapture } from '../../utils/process'
import { buildCommonArgs } from './args'
import { ytdlpEnv } from './binary'
import { normalizeInfo, parseJsonOutput } from './parser'

export class InfoService {
  private running = new Map<string, Promise<MediaInfo>>()

  constructor(
    private readonly settings: SettingsService,
    private readonly binaries: BinaryManager,
    private readonly cookies: CookieService,
  ) {}

  async get(url: string, flat = true, limit?: number): Promise<MediaInfo> {
    const key = `${url}\n${flat}\n${limit ?? ''}`
    const existing = this.running.get(key)
    if (existing)
      return existing
    const promise = this.fetch(url, flat, limit).finally(() => this.running.delete(key))
    this.running.set(key, promise)
    return promise
  }

  private async fetch(url: string, flat: boolean, limit?: number) {
    const command = await this.binaries.requireYtdlp()
    const ffmpeg = await this.binaries.ffmpeg()
    const settings = this.settings.value
    const args = [
      '--dump-single-json',
      '--no-warnings',
      '--no-colors',
      '--no-simulate',
    ]
    if (flat)
      args.push('--flat-playlist')
    if (limit && limit > 0)
      args.push('--playlist-end', String(limit))
    args.push(...buildCommonArgs({
      settings,
      cookiesFile: this.cookies.hasEnabled ? this.cookies.mergedFile : undefined,
      ffmpegPath: ffmpeg?.path,
    }))
    args.push('--', url)

    const result = await execCapture(command, args, {
      timeout: flat ? 2 * 60_000 : 5 * 60_000,
      env: ytdlpEnv,
      maxBuffer: 128 * 1024 * 1024,
    })
    if (result.code !== 0) {
      const message = result.stderr.trim().split('\n').slice(-5).join('\n') || 'yt-dlp failed to analyze URL'
      throw new Error(message)
    }
    return normalizeInfo(parseJsonOutput(result.stdout), url)
  }
}
