import type { LogCategory, LogLevel } from '@yt-dlp-studio/shared'
import type { LogFilter } from './useLogFeed'
import { LOG_CATEGORIES, LOG_LEVELS } from '@yt-dlp-studio/shared'
import clsx from 'clsx'
import { Pause, Play, Search } from 'lucide-react'
import { CATEGORY_META, LEVEL_META } from '../../lib/logs'

interface Props {
  filter: LogFilter
  onChange: (filter: LogFilter) => void
  paused: boolean
  onPausedChange: (paused: boolean) => void
  /** Entries waiting while paused */
  pending: number
}

const CATEGORIES: (LogCategory | '')[] = ['', ...LOG_CATEGORIES]

export function LogToolbar({ filter, onChange, paused, onPausedChange, pending }: Props) {
  const set = <K extends keyof LogFilter>(key: K, value: LogFilter[K]) => onChange({ ...filter, [key]: value })
  return (
    <div className="surface mb-5 flex flex-col gap-3 p-3">
      <div className="flex gap-1 overflow-x-auto">
        {CATEGORIES.map((item) => {
          const meta = item ? CATEGORY_META[item] : null
          const Icon = meta?.icon
          return (
            <button key={item || 'all'} onClick={() => set('category', item)} className={clsx('inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition', filter.category === item ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/6')}>
              {Icon && <Icon size={14} />}
              {meta?.label ?? '全部'}
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} />
          <input className="input-base py-2 pl-9" value={filter.search} onChange={event => set('search', event.target.value)} placeholder="搜索消息、链接、任务 ID 或详情" />
        </div>
        <div className="flex gap-2">
          <select className="input-base py-2 sm:w-36" value={filter.level} onChange={event => set('level', event.target.value as LogLevel)} aria-label="日志级别">
            {LOG_LEVELS.map(level => <option key={level} value={level}>{LEVEL_META[level].filter}</option>)}
          </select>
          <button className={clsx('shrink-0', paused ? 'btn-primary py-2' : 'btn-secondary py-2')} onClick={() => onPausedChange(!paused)} title={paused ? '继续实时刷新' : '暂停实时刷新，方便查看'}>
            {paused ? <Play size={15} /> : <Pause size={15} />}
            {paused ? (pending ? `继续（${pending} 条新日志）` : '继续') : '暂停'}
          </button>
        </div>
      </div>
    </div>
  )
}
