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
            <Trash2 size={16} />
            清理记录
          </button>
        )}
      />
      <YtdlpRequired className="mb-5" />
      <div className="surface mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 overflow-x-auto">
          {(['active', 'completed', 'failed', 'all'] as Filter[]).map(item => (
            <button key={item} onClick={() => setFilter(item)} className={clsx('shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition', filter === item ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/6')}>
              {{ active: '进行中', completed: '已完成', failed: '失败', all: '全部' }[item]}
              {' '}
              <span className="ml-1 opacity-60">{counts[item]}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} />
          <input className="input-base py-2 pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索任务" />
        </div>
      </div>

      {filtered.length ? <div className="space-y-3">{filtered.map(task => <TaskCard key={task.id} task={task} />)}</div> : <div className="surface"><EmptyState icon={ListVideo} title="这里还没有任务" description={filter === 'active' ? '新建下载后，任务会显示在这里并自动开始。' : '当前筛选条件下没有任务记录。'} /></div>}
    </div>
  )
}

function TaskCard({ task }: { task: DownloadTask }) {
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
    <article className="surface overflow-hidden p-4 sm:p-5">
      <div className="flex gap-4">
        <div className="relative hidden aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5 sm:block">
          {task.thumbnail ? <img src={task.thumbnail} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className="flex h-full items-center justify-center text-slate-300"><Download size={25} /></div>}
          <span className="absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white uppercase">{task.options.kind}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={task.title}>{task.title}</h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <StatusBadge status={task.status} />
                {task.uploader && (
                  <>
                    <span>·</span>
                    <span className="truncate">{task.uploader}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              {task.status === 'downloading' || task.status === 'processing' || task.status === 'queued' ? <button className="icon-btn" title="暂停" onClick={() => action('pause')}><Pause size={17} /></button> : null}
              {task.status === 'paused' && <button className="icon-btn" title={ready ? '继续' : '需要先安装 yt-dlp'} disabled={!ready} onClick={() => action('resume')}><Play size={17} /></button>}
              {['failed', 'canceled'].includes(task.status) && <button className="icon-btn" title={ready ? '重试' : '需要先安装 yt-dlp'} disabled={!ready} onClick={() => action('retry')}><RotateCcw size={17} /></button>}
              {active && <button className="icon-btn" title="取消" onClick={() => action('cancel')}><CircleX size={17} /></button>}
              {!active && <button className="icon-btn" title="移除记录" onClick={remove}><Trash2 size={17} /></button>}
            </div>
          </div>

          {active && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>{task.progress.stage || (task.status === 'queued' ? '等待下载' : '正在下载')}</span>
                <span>
                  {task.progress.percent.toFixed(1)}
                  %
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/7"><div className={clsx('h-full rounded-full transition-all duration-500', task.status === 'paused' ? 'bg-amber-400' : 'bg-brand-500')} style={{ width: `${Math.max(task.status === 'queued' ? 1 : 0, task.progress.percent)}%` }} /></div>
              <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-400">
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
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{formatBytes(task.size)}</span>
              <span>·</span>
              <span>
                {task.files.length}
                {' '}
                个文件
              </span>
              {firstFile && (
                <>
                  <a className="btn-ghost ml-auto px-2.5 py-1.5" href={libraryUrl(firstFile)} target="_blank" rel="noreferrer">
                    <Play size={14} />
                    预览
                  </a>
                  <a className="btn-ghost px-2.5 py-1.5" href={libraryUrl(firstFile, true)}>
                    <Download size={14} />
                    下载
                  </a>
                </>
              )}
            </div>
          )}
          {task.error && <div className="mt-3 line-clamp-3 rounded-lg bg-red-50 px-3 py-2 font-mono text-[11px] leading-5 text-red-600 dark:bg-red-500/8 dark:text-red-400" title={task.error}>{task.error}</div>}
        </div>
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
