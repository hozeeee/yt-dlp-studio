import type { LogCategory, LogEntry, LogLevel, LogPage, LogQuery } from '@yt-dlp-studio/shared'
import { matchesLogQuery } from '@yt-dlp-studio/shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { logQueryString } from '../../lib/logs'
import { onServerEvent, useAppStore } from '../../stores/app'
import { toast } from '../../stores/toast'

export interface LogFilter {
  level: LogLevel
  category: LogCategory | ''
  search: string
}

const PAGE_SIZE = 200
/** Live entries are prepended; past this the oldest leave the view and come back through "load more" */
const MAX_VISIBLE = 2000

interface Feed {
  /** Newest first */
  entries: LogEntry[]
  hasMore: boolean
}

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(setDebounced, delay, value)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Newer entries on top of the feed, skipping ones it already has */
function prepend(feed: Feed, fresh: LogEntry[]): Feed {
  const top = feed.entries[0]?.id ?? 0
  const added = fresh.filter(entry => entry.id > top)
  if (!added.length)
    return feed
  const entries = [...added, ...feed.entries]
  return entries.length > MAX_VISIBLE ? { entries: entries.slice(0, MAX_VISIBLE), hasMore: true } : { ...feed, entries }
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/** Paged log entries matching a filter, kept up to date through the realtime stream */
export function useLogFeed(filter: LogFilter) {
  const [feed, setFeed] = useState<Feed>({ entries: [], hasMore: false })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const connected = useAppStore(state => state.connected)
  const search = useDebounced(filter.search.trim(), 300)
  const query = useMemo<LogQuery>(() => ({ level: filter.level, category: filter.category || undefined, search: search || undefined }), [filter.level, filter.category, search])

  const requestRef = useRef(0)
  const pausedRef = useRef(false)
  /** Live entries held back while paused, newest first */
  const pendingRef = useRef<LogEntry[]>([])
  /** Live entries received while a reload is in flight, merged once it lands */
  const bufferRef = useRef<LogEntry[] | null>(null)

  const setPending = useCallback((entries: LogEntry[]) => {
    pendingRef.current = entries.slice(0, MAX_VISIBLE)
    setPendingCount(pendingRef.current.length)
  }, [])

  const reload = useCallback(async () => {
    const id = ++requestRef.current
    bufferRef.current = []
    setLoading(true)
    try {
      const page = await api<LogPage>(`/logs${logQueryString({ ...query, limit: PAGE_SIZE })}`)
      if (id !== requestRef.current)
        return
      const top = page.entries[0]?.id ?? 0
      const live = (bufferRef.current ?? []).filter(entry => entry.id > top)
      setFeed(pausedRef.current ? page : prepend(page, live))
      setPending(pausedRef.current ? live : [])
    }
    catch (error) {
      if (id === requestRef.current)
        toast.error('日志加载失败', errorText(error))
    }
    finally {
      if (id === requestRef.current) {
        bufferRef.current = null
        setLoading(false)
      }
    }
  }, [query, setPending])

  useEffect(() => {
    void reload()
  }, [reload])

  // Entries may have been missed while the realtime stream was down
  const wasConnectedRef = useRef(connected)
  useEffect(() => {
    if (connected && !wasConnectedRef.current)
      void reload()
    wasConnectedRef.current = connected
  }, [connected, reload])

  useEffect(() => onServerEvent((event) => {
    if (event.type === 'log:cleared') {
      setFeed({ entries: [], hasMore: false })
      setPending([])
      if (bufferRef.current)
        bufferRef.current = []
      return
    }
    if (event.type !== 'log:added')
      return
    // Server batches are oldest first, the feed is newest first
    const fresh = event.entries.filter(entry => matchesLogQuery(entry, query)).reverse()
    if (!fresh.length)
      return
    if (bufferRef.current)
      bufferRef.current.unshift(...fresh)
    else if (pausedRef.current)
      setPending([...fresh, ...pendingRef.current])
    else
      setFeed(current => prepend(current, fresh))
  }), [query, setPending])

  const setPaused = useCallback((next: boolean) => {
    pausedRef.current = next
    setIsPaused(next)
    if (next)
      return
    const held = pendingRef.current
    setPending([])
    // The held entries were capped, so there may be a gap between them and the feed
    if (held.length >= MAX_VISIBLE)
      void reload()
    else if (held.length)
      setFeed(current => prepend(current, held))
  }, [reload, setPending])

  async function loadMore() {
    const last = feed.entries.at(-1)
    if (!last || loadingMore)
      return
    setLoadingMore(true)
    try {
      const page = await api<LogPage>(`/logs${logQueryString({ ...query, before: last.id, limit: PAGE_SIZE })}`)
      setFeed((current) => {
        const bottom = current.entries.at(-1)?.id ?? Infinity
        return { entries: [...current.entries, ...page.entries.filter(entry => entry.id < bottom)], hasMore: page.hasMore }
      })
    }
    catch (error) {
      toast.error('日志加载失败', errorText(error))
    }
    finally {
      setLoadingMore(false)
    }
  }

  return { ...feed, query, loading, loadingMore, loadMore, reload, paused: isPaused, setPaused, pending: pendingCount }
}
