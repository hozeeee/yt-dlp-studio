import type { ServerConfig } from '../config'
import { ensureDir } from '../utils/fs'
import { AuthService } from './auth'
import { CookieService } from './cookies'
import { EventBus } from './events'
import { LibraryService } from './library'
import { LogService } from './logs'
import { SettingsService } from './settings'
import { SubscriptionService } from './subscriptions'
import { SystemService } from './system'
import { BinaryManager } from './ytdlp/binary'
import { InfoService } from './ytdlp/info'
import { DownloadQueue } from './ytdlp/queue'

export class AppServices {
  readonly events = new EventBus()
  readonly logs: LogService
  readonly auth: AuthService
  readonly settings: SettingsService
  readonly binaries: BinaryManager
  readonly cookies: CookieService
  readonly info: InfoService
  readonly queue: DownloadQueue
  readonly subscriptions: SubscriptionService
  readonly library: LibraryService
  readonly system: SystemService

  constructor(readonly config: ServerConfig) {
    this.logs = new LogService(config.dataDir, this.events)
    this.auth = new AuthService(config)
    this.settings = new SettingsService(config, this.events, () => this.auth.enabled)
    this.binaries = new BinaryManager(config.dataDir, this.settings, this.events)
    this.cookies = new CookieService(config.dataDir, this.events)
    this.info = new InfoService(config.dataDir, this.settings, this.binaries, this.cookies)
    this.queue = new DownloadQueue(config.dataDir, this.settings, this.events, this.binaries, this.info, this.cookies)
    this.subscriptions = new SubscriptionService(config.dataDir, this.settings, this.events, this.info, this.queue)
    this.library = new LibraryService(this.settings)
    this.system = new SystemService(config, this.settings, this.binaries, this.cookies, this.auth)
  }

  async init() {
    await ensureDir(this.config.dataDir)
    // First, so the other services can log while starting
    await this.logs.init()
    await this.auth.init()
    await this.settings.init()
    await this.cookies.init()
    await this.queue.init()
    await this.subscriptions.init()
  }

  async shutdown() {
    await Promise.all([
      this.queue.shutdown(),
      this.subscriptions.shutdown(),
      this.settings.flush(),
    ])
    await this.logs.shutdown()
  }
}
