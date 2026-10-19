import type { LibraryEntry, LibraryListing } from '@yt-dlp-studio/shared'
import clsx from 'clsx'
import { Download, File, FileAudio, FileImage, FileText, FileVideo, Folder, FolderOpen, Grid2X2, List, MoreVertical, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { api, json, libraryUrl } from '../lib/api'
import { formatBytes, formatDate } from '../lib/format'
import { confirmDialog, promptDialog } from '../stores/dialog'
import { toast } from '../stores/toast'

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
              <Plus size={16} />
              新建文件夹
            </button>
            <button className="icon-btn" aria-label="刷新" title="刷新" onClick={() => load()}><RefreshCw size={17} /></button>
          </>
        )}
      />
      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/7 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm">
            <button className="rounded-lg px-2 py-1.5 font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10" onClick={() => load('')}>下载目录</button>
            {parts.map((part, index) => (
              <span key={parts.slice(0, index + 1).join('/')} className="flex items-center gap-1">
                <span className="text-slate-300">/</span>
                <button className="max-w-40 truncate rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/6" onClick={() => load(parts.slice(0, index + 1).join('/'))}>{part}</button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={15} />
              <input className="input-base py-2 pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索文件" />
            </div>
            <div className="flex rounded-xl border border-slate-200 p-1 dark:border-white/10">
              <button className={clsx('icon-btn size-8 rounded-lg', grid && 'bg-slate-100 text-slate-900 dark:bg-white/8 dark:text-white')} onClick={() => setGrid(true)}><Grid2X2 size={15} /></button>
              <button className={clsx('icon-btn size-8 rounded-lg', !grid && 'bg-slate-100 text-slate-900 dark:bg-white/8 dark:text-white')} onClick={() => setGrid(false)}><List size={16} /></button>
            </div>
          </div>
        </div>

        {loading
          ? <div className="flex min-h-80 items-center justify-center"><Spinner /></div>
          : entries.length
            ? (
                <div className={clsx(grid ? 'grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6' : 'divide-y divide-slate-100 dark:divide-white/6')}>
                  {entries.map(entry => grid ? <GridItem key={entry.path} entry={entry} onOpen={() => open(entry)} onRemove={() => remove(entry)} /> : <ListItem key={entry.path} entry={entry} onOpen={() => open(entry)} onRemove={() => remove(entry)} />)}
                </div>
              )
            : <EmptyState icon={FolderOpen} title="文件夹为空" description={search ? '没有找到匹配的文件。' : '下载完成的文件会显示在这里。'} />}
      </div>
      <PreviewModal entry={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

const ICONS = { directory: Folder, video: FileVideo, audio: FileAudio, image: FileImage, subtitle: FileText, other: File }
const COLORS = { directory: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10', video: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10', audio: 'text-pink-500 bg-pink-50 dark:bg-pink-500/10', image: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10', subtitle: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10', other: 'text-slate-400 bg-slate-100 dark:bg-white/5' }

function GridItem({ entry, onOpen, onRemove }: { entry: LibraryEntry, onOpen: () => void, onRemove: () => void }) {
  const Icon = ICONS[entry.type]
  return (
    <div className="group relative min-w-0 rounded-xl border border-slate-200/70 p-3 transition hover:border-brand-300 hover:shadow-sm dark:border-white/7 dark:hover:border-brand-500/40">
      <button className="w-full text-left" onDoubleClick={onOpen} onClick={entry.type === 'directory' ? onOpen : undefined}>
        <div className={clsx('mb-3 flex aspect-[4/3] items-center justify-center rounded-xl', COLORS[entry.type])}>{entry.type === 'image' ? <img src={libraryUrl(entry.path)} className="h-full w-full rounded-xl object-cover" alt="" /> : <Icon size={38} strokeWidth={1.4} />}</div>
        <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200" title={entry.name}>{entry.name}</div>
        <div className="mt-1 text-[11px] text-slate-400">{entry.type === 'directory' ? `${entry.children ?? '—'} 项` : formatBytes(entry.size)}</div>
      </button>
      <div className="absolute top-4 right-4 flex rounded-lg bg-white/90 shadow group-focus-within:flex pointer-fine:hidden pointer-fine:group-hover:flex dark:bg-slate-900/90">
        <button className="icon-btn size-8" onClick={onOpen} title="打开"><MoreVertical size={15} /></button>
        <button className="icon-btn size-8 text-red-500" onClick={onRemove} title="删除"><Trash2 size={15} /></button>
      </div>
    </div>
  )
}

function ListItem({ entry, onOpen, onRemove }: { entry: LibraryEntry, onOpen: () => void, onRemove: () => void }) {
  const Icon = ICONS[entry.type]
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-white/3">
      <button className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl', COLORS[entry.type])} onClick={onOpen}><Icon size={20} /></button>
      <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{entry.name}</div>
        <div className="mt-0.5 text-[11px] text-slate-400">{entry.type === 'directory' ? `${entry.children ?? '—'} 项` : formatBytes(entry.size)}</div>
      </button>
      <div className="hidden text-xs text-slate-400 sm:block">{formatDate(entry.mtime)}</div>
      <a className="icon-btn" aria-label="下载" href={libraryUrl(entry.path, true)} onClick={event => entry.type === 'directory' && event.preventDefault()}><Download size={16} /></a>
      <button className="icon-btn text-red-500" aria-label="删除" onClick={onRemove}><Trash2 size={16} /></button>
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
            <Download size={16} />
            下载文件
          </a>
        </>
      )}
    >
      <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-xl bg-slate-950">
        {entry.type === 'video' && <video className="max-h-[min(65vh,calc(88dvh-13rem))] w-full" src={url} controls autoPlay />}
        {entry.type === 'audio' && (
          <div className="w-full max-w-xl p-10">
            <div className="mx-auto mb-8 flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-white"><FileAudio size={40} /></div>
            <audio className="w-full" src={url} controls autoPlay />
          </div>
        )}
        {entry.type === 'image' && <img className="max-h-[min(65vh,calc(88dvh-13rem))] max-w-full object-contain" src={url} alt={entry.name} />}
        {!['video', 'audio', 'image'].includes(entry.type) && (
          <div className="p-14 text-center text-slate-300">
            <FileText className="mx-auto mb-4" size={48} />
            <p>此文件类型不支持内嵌预览</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
