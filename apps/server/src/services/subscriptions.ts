import type { CreateSubscriptionRequest, DownloadEntry, Subscription, UpdateSubscriptionRequest } from '@yt-dlp-studio/shared'
import type { EventBus } from './events'
import type { SettingsService } from './settings'
import type { InfoService } from './ytdlp/info'
import type { DownloadQueue } from './ytdlp/queue'
import path from 'node:path'
import { mergeDownloadOptions } from '../schemas'
import { createId } from '../utils/id'
import { createLogger } from '../utils/logger'
import { JsonStore } from './store'

const logger = createLogger('subscriptions')

interface StoredSubscription extends Subscription {
  seenIds: string[]
}

interface SubscriptionStore {
  subscriptions: StoredSubscription[]
}

export class SubscriptionService {
  private store: JsonStore<SubscriptionStore>
  private timer?: NodeJS.Timeout
  private checking = new Set<string>()

  constructor(
    dataDir: string,
    private readonly settings: SettingsService,
    private readonly bus: EventBus,
    private readonly info: InfoService,
    private readonly queue: DownloadQueue,
  ) {
    this.store = new JsonStore(path.join(dataDir, 'subscriptions.json'), { subscriptions: [] })
  }

  async init() {
    await this.store.load(raw => ({ subscriptions: Array.isArray(raw.subscriptions) ? raw.subscriptions : [] }))
    this.timer = setInterval(() => this.tick(), 60_000)
    this.timer.unref()
    setTimeout(() => this.tick(), 5_000).unref()
  }

  list(): Subscription[] {
    return this.store.data.subscriptions.map(this.public.bind(this))
  }

  async create(request: CreateSubscriptionRequest) {
    const options = mergeDownloadOptions(this.settings.value.defaultOptions, request.options)
    const media = await this.info.get(request.url, { limit: this.settings.value.subscriptionScanLimit, cookies: options.cookies })
    const now = Date.now()
    const existing = this.store.data.subscriptions.find(item => item.url === request.url)
    if (existing)
      throw new Error('This URL is already subscribed')

    const seenIds = request.downloadExisting ? [] : (media.entries ?? []).map(entry => entry.id || entry.url)
    const item: StoredSubscription = {
      id: createId(),
      url: request.url,
      title: media.title,
      thumbnail: media.thumbnail ?? media.entries?.[0]?.thumbnail,
      enabled: true,
      interval: request.interval ?? this.settings.value.subscriptionInterval,
      options,
      createdAt: now,
      lastCheckedAt: now,
      seenCount: seenIds.length,
      queuedCount: 0,
      seenIds,
    }
    this.store.data.subscriptions.unshift(item)
    await this.store.flush()
    this.emit(item)
    if (request.downloadExisting)
      await this.check(item.id)
    return this.public(item)
  }

  async update(id: string, request: UpdateSubscriptionRequest) {
    const item = this.find(id)
    if (!item)
      return null
    if (request.title !== undefined)
      item.title = request.title
    if (request.enabled !== undefined)
      item.enabled = request.enabled
    if (request.interval !== undefined)
      item.interval = request.interval
    if (request.options)
      item.options = mergeDownloadOptions(item.options, request.options)
    await this.store.flush()
    this.emit(item)
    return this.public(item)
  }

  async remove(id: string) {
    const before = this.store.data.subscriptions.length
    this.store.data.subscriptions = this.store.data.subscriptions.filter(item => item.id !== id)
    if (this.store.data.subscriptions.length === before)
      return false
    await this.store.flush()
    this.bus.emit({ type: 'subscription:removed', id })
    return true
  }

  async check(id: string) {
    const item = this.find(id)
    if (!item)
      throw new Error('Subscription not found')
    if (this.checking.has(id))
      return this.public(item)

    this.checking.add(id)
    item.checking = true
    this.emit(item)
    try {
      const media = await this.info.get(item.url, { limit: this.settings.value.subscriptionScanLimit, cookies: item.options.cookies })
      const entries = media.entries ?? [{
        id: media.id,
        url: media.url,
        title: media.title,
        thumbnail: media.thumbnail,
        uploader: media.uploader,
        duration: media.duration,
      }]
      const known = new Set(item.seenIds)
      const fresh = entries.filter(entry => !known.has(entry.id || entry.url))
      for (const entry of entries)
        known.add(entry.id || entry.url)
      item.seenIds = [...known].slice(-50_000)

      if (fresh.length) {
        const downloadEntries: DownloadEntry[] = fresh.reverse().map(entry => ({
          url: entry.url,
          title: entry.title,
          thumbnail: entry.thumbnail,
          uploader: entry.uploader,
          duration: entry.duration,
          playlist: media.type === 'playlist' ? { id: media.id, title: media.title } : undefined,
        }))
        const queued = this.queue.addEntries(downloadEntries, item.options, item.id)
        item.queuedCount += queued.length
      }
      item.title = media.title || item.title
      item.thumbnail = media.thumbnail || item.thumbnail
      item.seenCount = item.seenIds.length
      item.lastCheckedAt = Date.now()
      item.lastError = undefined
      logger.info(`Checked ${item.title}: ${fresh.length} new item(s)`)
    }
    catch (error) {
      item.lastCheckedAt = Date.now()
      item.lastError = error instanceof Error ? error.message : String(error)
      logger.warn(`Failed to check ${item.title}: ${item.lastError}`)
    }
    finally {
      this.checking.delete(id)
      item.checking = false
      await this.store.flush()
      this.emit(item)
    }
    return this.public(item)
  }

  async shutdown() {
    if (this.timer)
      clearInterval(this.timer)
    await this.store.flush()
  }

  private tick() {
    const now = Date.now()
    for (const item of this.store.data.subscriptions) {
      const due = !item.lastCheckedAt || now - item.lastCheckedAt >= item.interval * 60_000
      if (item.enabled && due && !this.checking.has(item.id))
        void this.check(item.id)
    }
  }

  private find(id: string) {
    return this.store.data.subscriptions.find(item => item.id === id)
  }

  private public(item: StoredSubscription): Subscription {
    const { seenIds: _, ...subscription } = item
    return subscription
  }

  private emit(item: StoredSubscription) {
    this.bus.emit({ type: 'subscription:updated', subscription: this.public(item) })
  }
}
