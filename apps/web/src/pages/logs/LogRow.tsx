import type { LogEntry } from '@yt-dlp-studio/shared'
import clsx from 'clsx'
import { ChevronRight, Copy } from 'lucide-react'
import { memo, useState } from 'react'
import { CATEGORY_META, formatLogTime, LEVEL_META } from '../../lib/logs'
import { toast } from '../../stores/toast'

const LEVEL_BORDER = {
  debug: 'border-l-transparent',
  info: 'border-l-transparent',
  warn: 'border-l-amber-400',
  error: 'border-l-red-500',
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  }
  catch {
    // The clipboard API needs a secure context, plain http on a LAN address is common here
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.append(area)
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    if (!copied)
      throw new Error('浏览器不允许访问剪贴板')
  }
}

function plainText(entry: LogEntry) {
  const data = Object.entries(entry.data ?? {}).filter(([, value]) => value != null && value !== '').map(([key, value]) => `${key}=${value}`)
  return [
    `${new Date(entry.time).toISOString()} ${entry.level.toUpperCase()} [${entry.category}]${entry.ref ? ` (${entry.ref})` : ''} ${entry.message}`,
    ...data,
    entry.detail,
  ].filter(Boolean).join('\n')
}

export const LogRow = memo(({ entry }: { entry: LogEntry }) => {
  const [open, setOpen] = useState(false)
  const level = LEVEL_META[entry.level]
  const category = CATEGORY_META[entry.category]
  const CategoryIcon = category.icon
  const data = Object.entries(entry.data ?? {}).filter(([, value]) => value != null && value !== '')
  const expandable = data.length > 0 || !!entry.detail || !!entry.ref

  async function copy() {
    try {
      await copyText(plainText(entry))
      toast.success('已复制日志')
    }
    catch (error) {
      toast.error('复制失败', error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <li className={clsx('border-l-2', LEVEL_BORDER[entry.level], open && 'bg-slate-50/80 dark:bg-white/2')}>
      <button
        type="button"
        className={clsx('flex w-full min-w-0 flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2 text-left sm:flex-nowrap sm:px-4', expandable ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/3' : 'cursor-default')}
        onClick={() => expandable && setOpen(!open)}
        aria-expanded={expandable ? open : undefined}
      >
        <ChevronRight size={14} className={clsx('mt-0.5 shrink-0 text-slate-400 transition-transform', open && 'rotate-90', !expandable && 'invisible')} />
        <time className="mt-px shrink-0 font-mono text-[11px] leading-5 text-slate-400 tabular-nums sm:w-28" dateTime={new Date(entry.time).toISOString()} title={new Date(entry.time).toLocaleString()}>{formatLogTime(entry.time)}</time>
        <span className={clsx('shrink-0 rounded-md px-1.5 py-0.5 text-[10px] leading-4 font-semibold', level.badge)}>{level.label}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400 sm:w-20">
          <CategoryIcon size={12} />
          {category.label}
        </span>
        <span className={clsx('min-w-0 basis-full text-[13px] leading-5 break-words sm:flex-1 sm:basis-auto', level.row)}>{entry.message}</span>
        {entry.ref && <span className="hidden shrink-0 font-mono text-[11px] leading-5 text-slate-400 md:inline" title="关联 ID">{entry.ref}</span>}
      </button>

      {open && (
        <div className="space-y-2.5 px-3 pb-3 sm:pr-4 sm:pl-[2.6rem]">
          {(data.length > 0 || entry.ref) && (
            <dl className="flex flex-wrap gap-1.5">
              {entry.ref && <DataItem name="ref" value={entry.ref} />}
              {data.map(([key, value]) => <DataItem key={key} name={key} value={String(value)} />)}
            </dl>
          )}
          {entry.detail && <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 px-3 py-2.5 font-mono text-[11px] leading-5 whitespace-pre-wrap break-all text-slate-200 dark:bg-black/40">{entry.detail}</pre>}
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={copy}>
            <Copy size={13} />
            复制
          </button>
        </div>
      )}
    </li>
  )
})

function DataItem({ name, value }: { name: string, value: string }) {
  return (
    <div className="flex max-w-full min-w-0 items-baseline gap-1.5 rounded-md border border-slate-200/80 bg-white px-2 py-1 text-[11px] dark:border-white/8 dark:bg-white/4">
      <dt className="shrink-0 font-medium text-slate-400">{name}</dt>
      <dd className="min-w-0 font-mono break-all text-slate-700 dark:text-slate-300">{value}</dd>
    </div>
  )
}
