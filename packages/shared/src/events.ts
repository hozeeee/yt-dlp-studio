import type { LogEntry } from './log'
import type { PublicSettings } from './settings'
import type { Subscription } from './subscription'
import type { BinaryJob, CookieFile } from './system'
import type { DownloadTask } from './task'

export type TaskPatch = Partial<DownloadTask> & { id: string }

export type ServerEvent
  = | { type: 'snapshot', tasks: DownloadTask[], subscriptions: Subscription[] }
    | { type: 'task:added', tasks: DownloadTask[] }
    | { type: 'task:updated', patch: TaskPatch }
    | { type: 'task:removed', ids: string[] }
    | { type: 'subscription:updated', subscription: Subscription }
    | { type: 'subscription:removed', id: string }
    | { type: 'settings:updated', settings: PublicSettings }
    | { type: 'binary:job', job: BinaryJob }
    | { type: 'cookies:updated', files: CookieFile[] }
    | { type: 'log:added', entries: LogEntry[] }
    | { type: 'log:cleared' }
