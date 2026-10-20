import type { DownloadTask, TaskAction, TaskStatus } from '@yt-dlp-studio/shared'
import clsx from 'clsx'
import { CircleX, Download, ListVideo, Pause, Play, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { YtdlpRequired } from '../components/YtdlpRequired'
import { api, json, libraryUrl } from '../lib/api'
import { useYtdlpReady } from '../lib/binaries'
import { formatBytes, formatEta, formatSpeed } from '../lib/format'
import { useAppStore } from '../stores/app'
import { confirmDialog } from '../stores/dialog'
import { toast } from '../stores/toast'

type Filter = 'active' | 'completed' | 'failed' | 'all'

const FILTER_LABELS: Record<Filter, string> = { active: '进行中', completed: '已完成', failed: '失败', all: '全部' }

export function TasksPage() {
  const tasks = useAppStore(state => state.tasks)
  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => tasks.filter((task) => {
    const statusMatches = filter === 'all'
      || (filter === 'active' && ['queued', 'downloading', 'processing', 'paused'].includes(task.status))
      || (filter === 'completed' && task.status === 'completed')
      || (filter === 'failed' && ['failed', 'canceled'].includes(task.status))
    return statusMatches && (!search || `${task.title} ${task.uploader ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  }), [tasks, filter, search])
  const counts = {
    active: tasks.filter(item => ['queued', 'downloading', 'processing', 'paused'].includes(item.status)).length,
    completed: tasks.filter(item => item.status === 'completed').length,
    failed: tasks.filter(item => ['failed', 'canceled'].includes(item.status)).length,
    all: tasks.length,
  }

  async function clear() {
    if (!await confirmDialog({ title: '清理任务记录？', description: '将移除所有已完成、失败和取消的任务记录，已下载的文件不会被删除。', confirmText: '清理' }))
      return
    try {
      const result = await api<{ removed: number }>('/tasks/clear', json('POST', { deleteFiles: false }))
      toast.success(`已清理 ${result.removed} 条记录`)
    }
    catch (error) {
      toast.error('清理失败', error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="下载任务"
        description="查看队列、实时进度和历史记录，随时暂停或重试任务。"
        icon={ListVideo}
        actions={(
          <button className="btn-secondary" onClick={clear}>
            <Trash2 />
            清理记录
          </button>
        )}
      />
      <YtdlpRequired className="mb-4" />
      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-200/80 p-2.5 sm:flex-row sm:items-center dark:border-white/8">
          <div className="segmented">
            {(Object.keys(FILTER_LABELS) as Filter[]).map(item => (
              <button key={item} data-active={filter === item} className="segmented-item" onClick={() => setFilter(item)}>
                {FILTER_LABELS[item]}
                <span className="count-badge">{counts[item]}</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:ml-auto sm:max-w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400" size={14} />
            <input className="input-base pl-8" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索任务" />
          </div>
        </div>
        {filtered.length
          ? <div className="divide-y divide-slate-100 dark:divide-white/6">{filtered.map(task => <TaskRow key={task.id} task={task} />)}</div>
          : <EmptyState icon={ListVideo} title="这里还没有任务" description={filter === 'active' ? '新建下载后，任务会显示在这里并自动开始。' : '当前筛选条件下没有任务记录。'} />}
      </div>
    </div>
  )
}

function TaskRow({ task }: { task: DownloadTask }) {
  const active = ['queued', 'downloading', 'processing', 'paused'].includes(task.status)
  const ready = useYtdlpReady()

  async function action(next: TaskAction) {
    try {
      await api('/tasks/action', json('POST', { ids: [task.id], action: next }))
    }
    catch (error) {
      toast.error('操作失败', error instanceof Error ? error.message : String(error))
    }
  }

  async function remove() {
    if (!await confirmDialog({ title: '移除此任务？', description: '仅从列表中移除记录，已下载的文件会保留。', confirmText: '移除' }))
      return
    try {
      await api('/tasks/remove', json('POST', { ids: [task.id], deleteFiles: false }))
    }
    catch (error) {
      toast.error('移除失败', error instanceof Error ? error.message : String(error))
    }
  }

  const firstFile = task.files[0]
  return (
    <article className="flex gap-3 px-3 py-3 transition hover:bg-slate-50/70 sm:px-4 dark:hover:bg-white/2">
      <div className="relative hidden aspect-video w-28 shrink-0 self-start overflow-hidden rounded-md bg-slate-100 sm:block dark:bg-white/5">
        {task.thumbnail ? <img src={task.thumbnail} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-600"><Download size={20} /></div>}
        <span className="absolute right-1 bottom-1 rounded-sm bg-black/70 px-1 py-px text-[9px] font-semibold text-white uppercase">{task.options.kind}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13px] leading-5 font-medium text-slate-900 dark:text-slate-100" title={task.title}>{task.title}</h3>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <StatusBadge status={task.status} />
              {task.uploader && (
                <>
                  <span>·</span>
                  <span className="truncate">{task.uploader}</span>
                </>
              )}
            </div>
          </div>
          <div className="-my-1 -mr-1 flex shrink-0">
            {task.status === 'downloading' || task.status === 'processing' || task.status === 'queued' ? <button className="icon-btn" title="暂停" onClick={() => action('pause')}><Pause /></button> : null}
            {task.status === 'paused' && <button className="icon-btn" title={ready ? '继续' : '需要先安装 yt-dlp'} disabled={!ready} onClick={() => action('resume')}><Play /></button>}
            {['failed', 'canceled'].includes(task.status) && <button className="icon-btn" title={ready ? '重试' : '需要先安装 yt-dlp'} disabled={!ready} onClick={() => action('retry')}><RotateCcw /></button>}
            {active && <button className="icon-btn" title="取消" onClick={() => action('cancel')}><CircleX /></button>}
            {!active && <button className="icon-btn" title="移除记录" onClick={remove}><Trash2 /></button>}
          </div>
        </div>

        {active && (
          <div className="mt-2.5">
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/7"><div className={clsx('h-full rounded-full transition-all duration-500', task.status === 'paused' ? 'bg-amber-400' : 'bg-brand-500')} style={{ width: `${Math.max(task.status === 'queued' ? 1 : 0, task.progress.percent)}%` }} /></div>
              <span className="w-12 text-right text-[11px] font-medium text-slate-500 tabular-nums dark:text-slate-400">
                {task.progress.percent.toFixed(1)}
                %
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-400 tabular-nums">
              <span>{task.progress.stage || (task.status === 'queued' ? '等待下载' : '正在下载')}</span>
              <span>
                {formatBytes(task.progress.downloaded)}
                {' '}
                /
                {' '}
                {formatBytes(task.progress.total)}
              </span>
              <span>{formatSpeed(task.progress.speed)}</span>
              <span>
                剩余
                {formatEta(task.progress.eta)}
              </span>
            </div>
          </div>
        )}

        {task.status === 'completed' && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <span>{formatBytes(task.size)}</span>
            <span>·</span>
            <span>
              {task.files.length}
              {' '}
              个文件
            </span>
            {firstFile && (
              <div className="-my-1 ml-auto flex gap-0.5">
                <a className="btn-ghost btn-sm" href={libraryUrl(firstFile)} target="_blank" rel="noreferrer">
                  <Play />
                  预览
                </a>
                <a className="btn-ghost btn-sm" href={libraryUrl(firstFile, true)}>
                  <Download />
                  下载
                </a>
              </div>
            )}
          </div>
        )}
        {task.error && <div className="mt-2 line-clamp-2 rounded-md bg-red-50 px-2 py-1.5 font-mono text-[11px] leading-[18px] text-red-600 dark:bg-red-500/8 dark:text-red-400" title={task.error}>{task.error}</div>}
      </div>
    </article>
  )
}

const STATUS: Record<TaskStatus, { label: string, color: string }> = {
  queued: { label: '排队中', color: 'text-slate-500' },
  downloading: { label: '下载中', color: 'text-brand-600 dark:text-brand-400' },
  processing: { label: '处理中', color: 'text-violet-600 dark:text-violet-400' },
  paused: { label: '已暂停', color: 'text-amber-600 dark:text-amber-400' },
  completed: { label: '已完成', color: 'text-emerald-600 dark:text-emerald-400' },
  failed: { label: '失败', color: 'text-red-600 dark:text-red-400' },
  canceled: { label: '已取消', color: 'text-slate-400' },
}
function StatusBadge({ status }: { status: TaskStatus }) {
  const item = STATUS[status]
  return (
    <span className={clsx('inline-flex items-center gap-1 font-medium', item.color)}>
      {['downloading', 'processing'].includes(status) && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {item.label}
    </span>
  )
}
