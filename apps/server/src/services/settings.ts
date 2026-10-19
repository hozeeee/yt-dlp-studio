import type { AppSettings, PublicSettings, SettingsUpdate } from '@yt-dlp-studio/shared'
import type { ServerConfig } from '../config'
import type { EventBus } from './events'
import path from 'node:path'
import { DEFAULT_SETTINGS } from '@yt-dlp-studio/shared'
import { mergeDownloadOptions, settingsUpdateSchema } from '../schemas'
import { ensureDir } from '../utils/fs'
import { JsonStore } from './store'

export class SettingsService {
  private store: JsonStore<Partial<AppSettings>>
  private current!: AppSettings
  private listeners = new Set<(settings: AppSettings, prev: AppSettings) => void>()

  constructor(
    private readonly config: ServerConfig,
    private readonly bus: EventBus,
    private readonly isAuthEnabled: () => boolean,
  ) {
    this.store = new JsonStore(path.join(config.dataDir, 'settings.json'), {})
  }

  async init() {
    await this.store.load()
    this.current = this.compute()
    await ensureDir(this.current.downloadDir)
  }

  get value(): AppSettings {
    return this.current
  }

  get locked() {
    return Object.keys(this.config.overrides) as (keyof AppSettings)[]
  }

  toPublic(): PublicSettings {
    return {
      ...this.current,
      locked: this.locked,
      authEnabled: this.isAuthEnabled(),
    }
  }

  onChange(listener: (settings: AppSettings, prev: AppSettings) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async update(input: SettingsUpdate) {
    const patch = settingsUpdateSchema.parse(input)
    for (const key of this.locked)
      delete (patch as Record<string, unknown>)[key]

    const stored = this.store.data
    const { defaultOptions, ...rest } = patch
    Object.assign(stored, rest)
    if (defaultOptions)
      stored.defaultOptions = mergeDownloadOptions(stored.defaultOptions, defaultOptions)

    const prev = this.current
    this.current = this.compute()
    if (this.current.downloadDir !== prev.downloadDir)
      await ensureDir(this.current.downloadDir)
    await this.store.flush()

    for (const listener of this.listeners)
      listener(this.current, prev)
    this.bus.emit({ type: 'settings:updated', settings: this.toPublic() })
    return this.toPublic()
  }

  /** Re-broadcast settings, e.g. after auth state changes */
  broadcast() {
    this.bus.emit({ type: 'settings:updated', settings: this.toPublic() })
  }

  async flush() {
    await this.store.flush()
  }

  private compute(): AppSettings {
    const stored = this.store.data
    const merged: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      ...this.config.overrides,
      defaultOptions: mergeDownloadOptions(stored.defaultOptions),
    }
    merged.downloadDir = path.resolve(merged.downloadDir || 'downloads')
    return merged
  }
}
