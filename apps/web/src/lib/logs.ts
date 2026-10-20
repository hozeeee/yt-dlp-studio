import type { LogCategory, LogLevel, LogQuery } from '@yt-dlp-studio/shared'
import type { LucideIcon } from 'lucide-react'
import { Cookie, Download, FolderOpen, KeyRound, Package, ScanSearch, Server, Tv } from 'lucide-react'
import { API_BASE } from './api'

export const LEVEL_META: Record<LogLevel, { label: string, filter: string, badge: string, row: string }> = {
  debug: {
    label: '调试',
    filter: '全部级别',
    badge: 'bg-slate-100 text-slate-500 dark:bg-white/6 dark:text-slate-400',
    row: 'text-slate-500 dark:text-slate-400',
  },
  info: {
    label: '信息',
    filter: '信息及以上',
    badge: 'bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300',
    row: 'text-slate-800 dark:text-slate-200',
  },
  warn: {
    label: '警告',
    filter: '警告及以上',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300',
    row: 'text-amber-800 dark:text-amber-200',
  },
  error: {
    label: '错误',
    filter: '仅错误',
    badge: 'bg-red-50 text-red-700 dark:bg-red-500/12 dark:text-red-300',
    row: 'text-red-700 dark:text-red-300',
  },
}

export const CATEGORY_META: Record<LogCategory, { label: string, icon: LucideIcon }> = {
  preview: { label: '预览解析', icon: ScanSearch },
  download: { label: '下载', icon: Download },
  subscription: { label: '订阅', icon: Tv },
  library: { label: '文件库', icon: FolderOpen },
  binary: { label: '组件', icon: Package },
  cookies: { label: 'Cookie', icon: Cookie },
  auth: { label: '认证', icon: KeyRound },
  system: { label: '系统', icon: Server },
}

function pad(value: number, size = 2) {
  return String(value).padStart(size, '0')
}

/** `HH:mm:ss.SSS`, prefixed with the date when not today */
export function formatLogTime(time: number) {
  const date = new Date(time)
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
  if (date.toDateString() === new Date().toDateString())
    return clock
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${clock}`
}

export function logQueryString(query: LogQuery) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '')
      params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function logExportUrl(query: LogQuery) {
  return `${API_BASE}/logs/export${logQueryString(query)}`
}
