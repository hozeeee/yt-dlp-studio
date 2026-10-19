import type { SystemInfo } from '@yt-dlp-studio/shared'
import type { ServerConfig } from '../config'
import type { AuthService } from './auth'
import type { CookieService } from './cookies'
import type { SettingsService } from './settings'
import type { BinaryManager } from './ytdlp/binary'
import fs from 'node:fs/promises'
import process from 'node:process'
import { APP_VERSION } from '../config'

export class SystemService {
  constructor(
    private readonly config: ServerConfig,
    private readonly settings: SettingsService,
    private readonly binaries: BinaryManager,
    private readonly cookies: CookieService,
    private readonly auth: AuthService,
  ) {}

  async info(): Promise<SystemInfo & { authLocked: boolean }> {
    let disk: { free: number, total: number } | undefined
    try {
      const stat = await fs.statfs(this.settings.value.downloadDir)
      disk = { free: stat.bavail * stat.bsize, total: stat.blocks * stat.bsize }
    }
    catch {}
    const binaries = await this.binaries.status()
    return {
      version: APP_VERSION,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      ytdlp: binaries.ytdlp.info,
      ffmpeg: binaries.ffmpeg.info,
      binaries,
      downloadDir: this.settings.value.downloadDir,
      dataDir: this.config.dataDir,
      disk,
      cookiesFile: this.cookies.hasEnabled,
      container: this.config.container,
      authLocked: this.auth.locked,
    }
  }
}
