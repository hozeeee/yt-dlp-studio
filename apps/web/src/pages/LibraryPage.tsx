import type { LibraryEntry, LibraryListing } from '@yt-dlp-studio/shared'
import clsx from 'clsx'
import { Download, FileAudio, FileText, FolderOpen, Grid2X2, List, MoreVertical, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { api, json, libraryUrl } from '../lib/api'
import { formatBytes, formatDate } from '../lib/format'
import { confirmDialog, promptDialog } from '../stores/dialog'
import { toast } from '../stores/toast'
import { EntryCover } from './library/EntryCover'

function getListing(path: string) {
  return api<LibraryListing>(`/library?path=${encodeURIComponent(path)}`)
}

export function LibraryPage() {
  const [current, setCurrent] = useState('')
  const [listing, setListing] = useState<LibraryListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [grid, setGrid] = useState(true)
  const [preview, setPreview] = useState<LibraryEntry | null>(null)
  const entries = useMemo(() => (listing?.entries ?? []).filter(item => !search || item.name.toLowerCase().includes(search.toLowerCase())), [listing, search])
  const parts = current.split('/').filter(Boolean)

  async function load(path = current) {
    setLoading(true)
    try {
      setListing(await getListing(path))
      setCurrent(path)
    }
    catch (error) {
      toast.error('无法读取文件库', error instanceof Error ? error.message : String(error))
    }
    finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void getListing('')
      .then(setListing)
      .catch(error => toast.error('无法读取文件库', error instanceof Error ? error.message : String(error)))
      .finally(() => setLoading(false))
  }, [])

  async function createFolder() {
    const name = (await promptDialog({ title: '新建文件夹', description: current ? `位于 ${current}` : '位于下载目录根目录', label: '文件夹名称', placeholder: '例如 Music', confirmText: '创建' }))?.trim()
    if (!name)
      return
    try {
      await api('/library/mkdir', json('POST', { path: [current, name].filter(Boolean).join('/') }))
      await load()
    }
    catch (error) {
      toast.error('创建失败', error instanceof Error ? error.message : String(error))
    }
  }

  async function remove(entry: LibraryEntry) {
    if (!await confirmDialog({ title: `永久删除「${entry.name}」？`, description: `${entry.type === 'directory' ? '文件夹及其中全部内容将被删除，' : ''}此操作无法撤销。`, confirmText: '删除', danger: true }))
      return
    try {
      await api('/library/remove', json('POST', { path: entry.path }))
      await load()
      toast.success('已删除', entry.name)
    }
    catch (error) {
      toast.error('删除失败', error instanceof Error ? error.message : String(error))
    }
  }

  function open(entry: LibraryEntry) {
    if (entry.type === 'directory')
      void load(entry.path)
    else
      setPreview(entry)
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="文件库"
        description="浏览、预览和管理服务器上的已下载媒体文件。"
        icon={FolderOpen}
        actions={(
          <>
            <button className="btn-secondary" onClick={createFolder}>
              <Plus />
              新建文件夹
            </button>
            <button className="btn-secondary w-8 px-0" aria-label="刷新" title="刷新" onClick={() => load()}><RefreshCw /></button>
          </>
        )}
      />
      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-200/80 p-2.5 sm:flex-row sm:items-center dark:border-white/8">
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto text-[13px]">
            <button className="h-7 shrink-0 rounded-md px-2 font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10" onClick={() => load('')}>下载目录</button>
            {parts.map((part, index) => (
              <span key={parts.slice(0, index + 1).join('/')} className="flex shrink-0 items-center gap-0.5">
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <button className="h-7 max-w-40 truncate rounded-md px-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/6" onClick={() => load(parts.slice(0, index + 1).join('/'))}>{part}</button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400" size={14} />
              <input className="input-base pl-8" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索文件" />
            </div>
            <div className="segmented">
              <button className="segmented-item px-2" data-active={grid} aria-label="网格视图" title="网格视图" onClick={() => setGrid(true)}><Grid2X2 /></button>
              <button className="segmented-item px-2" data-active={!grid} aria-label="列表视图" title="列表视图" onClick={() => setGrid(false)}><List /></button>
            </div>
          </div>
        </div>

        {loading
          ? <div className="flex min-h-56 items-center justify-center"><Spinner /></div>
          : entries.length
            ? (
                <div className={clsx(grid ? 'grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8' : 'divide-y divide-slate-100 dark:divide-white/6')}>
                  {entries.map(entry => grid ? <GridItem key={entry.path} entry={entry} onOpen={() => open(entry)} onRemove={() => remove(entry)} /> : <ListItem key={entry.path} entry={entry} onOpen={() => open(entry)} onRemove={() => remove(entry)} />)}
                </div>
              )
            : <EmptyState icon={FolderOpen} title="文件夹为空" description={search ? '没有找到匹配的文件。' : '下载完成的文件会显示在这里。'} />}
      </div>
      <PreviewModal entry={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

function GridItem({ entry, onOpen, onRemove }: { entry: LibraryEntry, onOpen: () => void, onRemove: () => void }) {
  return (
    <div className="group relative min-w-0 rounded-lg border border-slate-200/80 p-2 transition hover:border-slate-300 hover:bg-slate-50/60 dark:border-white/7 dark:hover:border-white/15 dark:hover:bg-white/2">
      <button className="w-full text-left" onDoubleClick={onOpen} onClick={entry.type === 'directory' ? onOpen : undefined}>
        <EntryCover entry={entry} className="mb-2 aspect-[4/3] rounded-md" iconSize={30} badge />
        <div className="truncate px-0.5 text-[13px] leading-5 font-medium text-slate-800 dark:text-slate-200" title={entry.name}>{entry.name}</div>
        <div className="px-0.5 text-[11px] text-slate-400">{entry.type === 'directory' ? `${entry.children ?? '—'} 项` : formatBytes(entry.size)}</div>
      </button>
      <div className="absolute top-3 right-3 flex rounded-md border border-slate-200/80 bg-white/95 shadow-xs group-focus-within:flex pointer-fine:hidden pointer-fine:group-hover:flex dark:border-white/10 dark:bg-slate-900/95">
        <button className="icon-btn size-7 rounded-md [&_svg]:size-3.5" onClick={onOpen} title="打开"><MoreVertical /></button>
        <button className="icon-btn size-7 rounded-md text-red-500 [&_svg]:size-3.5" onClick={onRemove} title="删除"><Trash2 /></button>
      </div>
    </div>
  )
}

function ListItem({ entry, onOpen, onRemove }: { entry: LibraryEntry, onOpen: () => void, onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50/70 sm:px-4 dark:hover:bg-white/2">
      <button className="shrink-0" onClick={onOpen}><EntryCover entry={entry} className="h-8 w-14 rounded-md" iconSize={16} /></button>
      <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <div className="truncate text-[13px] leading-5 font-medium text-slate-800 dark:text-slate-200">{entry.name}</div>
        <div className="text-[11px] text-slate-400">{entry.type === 'directory' ? `${entry.children ?? '—'} 项` : formatBytes(entry.size)}</div>
      </button>
      <div className="hidden text-xs text-slate-400 tabular-nums sm:block">{formatDate(entry.mtime)}</div>
      <div className="flex">
        <a className="icon-btn" aria-label="下载" href={libraryUrl(entry.path, true)} onClick={event => entry.type === 'directory' && event.preventDefault()}><Download /></a>
        <button className="icon-btn text-red-500" aria-label="删除" onClick={onRemove}><Trash2 /></button>
      </div>
    </div>
  )
}

function PreviewModal({ entry, onClose }: { entry: LibraryEntry | null, onClose: () => void }) {
  if (!entry)
    return null
  const url = libraryUrl(entry.path)
  return (
    <Modal
      open
      title={entry.name}
      description={`${formatBytes(entry.size)} · ${formatDate(entry.mtime)}`}
      onClose={onClose}
      size="xl"
      footer={(
        <>
          <button className="btn-secondary" onClick={onClose}>关闭</button>
          <a className="btn-primary" href={libraryUrl(entry.path, true)}>
            <Download />
            下载文件
          </a>
        </>
      )}
    >
      <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg bg-slate-950">
        {entry.type === 'video' && <video className="max-h-[min(65vh,calc(88dvh-13rem))] w-full" src={url} controls autoPlay />}
        {entry.type === 'audio' && (
          <div className="w-full max-w-xl p-8">
            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-white"><FileAudio size={40} /></div>
            <audio className="w-full" src={url} controls autoPlay />
          </div>
        )}
        {entry.type === 'image' && <img className="max-h-[min(65vh,calc(88dvh-13rem))] max-w-full object-contain" src={url} alt={entry.name} />}
        {!['video', 'audio', 'image'].includes(entry.type) && (
          <div className="p-10 text-center text-sm text-slate-300">
            <FileText className="mx-auto mb-3" size={40} />
            <p>此文件类型不支持内嵌预览</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
