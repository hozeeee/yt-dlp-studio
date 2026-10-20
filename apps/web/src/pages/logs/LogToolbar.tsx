import type { LogCategory, LogLevel } from '@yt-dlp-studio/shared'
import type { LogFilter } from './useLogFeed'
import { LOG_CATEGORIES, LOG_LEVELS } from '@yt-dlp-studio/shared'
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

/** Filter bar rendered as the header of the log list surface */
export function LogToolbar({ filter, onChange, paused, onPausedChange, pending }: Props) {
  const set = <K extends keyof LogFilter>(key: K, value: LogFilter[K]) => onChange({ ...filter, [key]: value })
  return (
    <div className="@container border-b border-slate-200/80 p-2.5 dark:border-white/8">
      <div className="flex flex-col gap-2 @4xl:flex-row @4xl:items-center">
        <div className="segmented self-start">
          {CATEGORIES.map((item) => {
            const meta = item ? CATEGORY_META[item] : null
            const Icon = meta?.icon
            return (
              <button key={item || 'all'} data-active={filter.category === item} className="segmented-item" onClick={() => set('category', item)}>
                {Icon && <Icon />}
                {meta?.label ?? '全部'}
              </button>
            )
          })}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 @md:flex-row @md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400" size={14} />
            <input className="input-base pl-8" value={filter.search} onChange={event => set('search', event.target.value)} placeholder="搜索消息、链接、任务 ID 或详情" />
          </div>
          <div className="flex gap-2">
            <select className="input-base min-w-0 flex-1 @md:w-32 @md:flex-none" value={filter.level} onChange={event => set('level', event.target.value as LogLevel)} aria-label="日志级别">
              {LOG_LEVELS.map(level => <option key={level} value={level}>{LEVEL_META[level].filter}</option>)}
            </select>
            <button className={paused ? 'btn-primary' : 'btn-secondary'} onClick={() => onPausedChange(!paused)} title={paused ? '继续实时刷新' : '暂停实时刷新，方便查看'}>
              {paused ? <Play /> : <Pause />}
              {paused ? (pending ? `继续（${pending} 条新日志）` : '继续') : '暂停'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
