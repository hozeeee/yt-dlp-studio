import type { DownloadOptions } from './task'

export interface Subscription {
  id: string
  url: string
  title: string
  thumbnail?: string
  enabled: boolean
  /** Check interval in minutes */
  interval: number
  options: DownloadOptions
  createdAt: number
  lastCheckedAt?: number
  lastError?: string
  checking?: boolean
  /** Number of known entries */
  seenCount: number
  /** Number of tasks queued by this subscription */
  queuedCount: number
}

export interface CreateSubscriptionRequest {
  url: string
  interval?: number
  options?: Partial<DownloadOptions>
  /** Queue existing entries immediately instead of only new uploads */
  downloadExisting?: boolean
}

export interface UpdateSubscriptionRequest {
  title?: string
  enabled?: boolean
  interval?: number
  options?: Partial<DownloadOptions>
}
