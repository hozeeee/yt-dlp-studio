import type { BinaryJob, CookieFile, DownloadTask, PublicSettings, ServerEvent, Subscription, SystemInfo, TaskPatch } from '@yt-dlp-studio/shared'
import { create } from 'zustand'
import { api, API_BASE, json } from '../lib/api'
import { toast } from './toast'

export interface ExtendedSystemInfo extends SystemInfo {
  authLocked: boolean
}

interface AuthStatus {
  enabled: boolean
  authenticated: boolean
}

interface AppState {
  initialized: boolean
  loading: boolean
  connected: boolean
  auth: AuthStatus | null
  settings: PublicSettings | null
  system: ExtendedSystemInfo | null
  tasks: DownloadTask[]
  subscriptions: Subscription[]
  cookies: CookieFile[]
  initialize: () => Promise<void>
  login: (password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSettings: () => Promise<void>
  refreshSystem: () => Promise<void>
  applyEvent: (event: ServerEvent) => void
  applyBinaryJob: (job: BinaryJob) => void
}

let events: EventSource | null = null
let initializing: Promise<void> | null = null

type ServerEventListener = (event: ServerEvent) => void
const listeners = new Set<ServerEventListener>()

/** Raw realtime events for pages keeping their own state (e.g. the logs page), returns the unsubscribe function */
export function onServerEvent(listener: ServerEventListener) {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

function patchTask(tasks: DownloadTask[], patch: TaskPatch) {
  return tasks.map(task => task.id === patch.id ? { ...task, ...patch } : task)
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  loading: true,
  connected: false,
  auth: null,
  settings: null,
  system: null,
  tasks: [],
  subscriptions: [],
  cookies: [],

  async initialize() {
    if (initializing)
      return initializing
    initializing = (async () => {
      set({ loading: true })
      try {
        const auth = await api<AuthStatus>('/auth/status')
        set({ auth })
        if (auth.authenticated)
          await loadProtected(set, get)
      }
      finally {
        set({ initialized: true, loading: false })
        initializing = null
      }
    })()
    return initializing
  },

  async login(password) {
    await api('/auth/login', json('POST', { password }))
    set({ auth: { enabled: true, authenticated: true }, loading: true })
    await loadProtected(set, get)
    set({ loading: false })
  },

  async logout() {
    await api('/auth/logout', { method: 'POST' })
    events?.close()
    events = null
    set({ auth: { enabled: true, authenticated: false }, settings: null, system: null, tasks: [], subscriptions: [], cookies: [], connected: false })
  },

  async refreshSettings() {
    set({ settings: await api<PublicSettings>('/settings') })
  },

  async refreshSystem() {
    set({ system: await api<ExtendedSystemInfo>('/system') })
  },

  applyEvent(event) {
    if (event.type === 'snapshot')
      set({ tasks: event.tasks, subscriptions: event.subscriptions })
    else if (event.type === 'task:added')
      set(state => ({ tasks: [...event.tasks, ...state.tasks.filter(item => !event.tasks.some(next => next.id === item.id))] }))
    else if (event.type === 'task:updated')
      set(state => ({ tasks: patchTask(state.tasks, event.patch) }))
    else if (event.type === 'task:removed')
      set(state => ({ tasks: state.tasks.filter(task => !event.ids.includes(task.id)) }))
    else if (event.type === 'subscription:updated')
      set(state => ({ subscriptions: [event.subscription, ...state.subscriptions.filter(item => item.id !== event.subscription.id)] }))
    else if (event.type === 'subscription:removed')
      set(state => ({ subscriptions: state.subscriptions.filter(item => item.id !== event.id) }))
    else if (event.type === 'settings:updated')
      set({ settings: event.settings })
    else if (event.type === 'binary:job')
      get().applyBinaryJob(event.job)
    else if (event.type === 'cookies:updated')
      set(state => ({ cookies: event.files, system: state.system && { ...state.system, cookiesFile: event.files.some(file => file.enabled) } }))
  },

  applyBinaryJob(job) {
    const system = get().system
    if (!system)
      return
    const previous = system.binaries[job.binary].job
    // Ignore stale updates: an older job arriving after a newer one, or the POST response landing after the job already finished
    if (previous && previous.id !== job.id && previous.startedAt > job.startedAt)
      return
    if (previous?.id === job.id && previous.status !== 'running')
      return
    set({ system: { ...system, binaries: { ...system.binaries, [job.binary]: { ...system.binaries[job.binary], job } } } })
    const finished = job.status !== 'running' && (!previous || previous.id !== job.id || previous.status === 'running')
    if (!finished)
      return
    void get().refreshSystem().catch(() => {})
    const name = job.binary === 'ytdlp' ? 'yt-dlp' : 'ffmpeg'
    const action = job.action === 'install' ? '安装' : '更新'
    if (job.status === 'success')
      toast.success(`${name} ${action}完成`, job.version)
    else if (job.status === 'error')
      toast.error(`${name} ${action}失败`, job.error)
  },
}))

type StoreSet = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
type StoreGet = () => AppState

async function loadProtected(set: StoreSet, get: StoreGet) {
  const [settings, system, tasks, subscriptions, cookies] = await Promise.all([
    api<PublicSettings>('/settings'),
    api<ExtendedSystemInfo>('/system'),
    api<DownloadTask[]>('/tasks'),
    api<Subscription[]>('/subscriptions'),
    api<CookieFile[]>('/cookies'),
  ])
  set({ settings, system, tasks, subscriptions, cookies })
  events?.close()
  events = new EventSource(`${API_BASE}/events`)
  let dropped = false
  events.onopen = () => {
    set({ connected: true })
    // Install jobs may have progressed or finished while the stream was down
    if (dropped)
      void get().refreshSystem().catch(() => {})
  }
  events.onerror = () => {
    dropped = true
    set({ connected: false })
  }
  events.onmessage = (message) => {
    let event: ServerEvent
    try {
      event = JSON.parse(message.data) as ServerEvent
    }
    catch {
      return
    }
    get().applyEvent(event)
    listeners.forEach(listener => listener(event))
  }
}
