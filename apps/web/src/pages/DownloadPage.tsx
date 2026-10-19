import type { AddDownloadsResponse, DownloadOptions, MediaInfo } from '@yt-dlp-studio/shared'
import { Clipboard, Download, Link2, ListVideo, Search, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { DownloadOptionsForm } from '../components/DownloadOptionsForm'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { YtdlpRequired } from '../components/YtdlpRequired'
import { api, json } from '../lib/api'
import { useYtdlpReady } from '../lib/binaries'
import { formatDuration } from '../lib/format'
import { useAppStore } from '../stores/app'
import { toast } from '../stores/toast'

export function DownloadPage() {
  const settings = useAppStore(state => state.settings)!
  const [input, setInput] = useState('')
  const [info, setInfo] = useState<MediaInfo | null>(null)
  const [options, setOptions] = useState<DownloadOptions>({ ...settings.defaultOptions })
  const [analyzing, setAnalyzing] = useState(false)
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()
  const ready = useYtdlpReady()
  const urls = input.split(/\s+/).map(value => value.trim()).filter(Boolean)

  async function paste() {
    try {
      setInput(await navigator.clipboard.readText())
    }
    catch {
      toast.error('无法读取剪贴板', '请手动粘贴链接')
    }
  }

  async function analyze() {
    if (!urls[0] || !ready)
      return
    setAnalyzing(true)
    setInfo(null)
    try {
      const media = await api<MediaInfo>('/info', json('POST', { url: urls[0], flat: true }))
      setInfo(media)
      toast.success('解析完成', media.type === 'playlist' ? `发现 ${media.playlistCount ?? media.entries?.length ?? 0} 个条目` : media.title)
    }
    catch (error) {
      toast.error('解析失败', error instanceof Error ? error.message : String(error))
    }
    finally {
      setAnalyzing(false)
    }
  }

  async function add() {
    if (!urls.length || !ready)
      return
    setAdding(true)
    try {
      const result = await api<AddDownloadsResponse>('/tasks', json('POST', { urls, options }))
      if (result.tasks.length)
        toast.success(`已添加 ${result.tasks.length} 个任务`, result.errors.length ? `${result.errors.length} 个链接添加失败` : '下载将在队列中自动开始')
      if (!result.tasks.length && result.errors.length)
        throw new Error(result.errors.map(item => item.error).join('\n'))
      setInput('')
      setInfo(null)
      navigate('/tasks')
    }
    catch (error) {
      toast.error('添加失败', error instanceof Error ? error.message : String(error))
    }
    finally {
      setAdding(false)
    }
  }

  return (
    <div className="page-enter">
      <PageHeader title="新建下载" description="粘贴一个或多个媒体链接，解析后选择格式并加入下载队列。" icon={Download} />
      <YtdlpRequired className="mb-6" />
      {/* A disabled fieldset disables every control inside it while yt-dlp is missing */}
      <fieldset disabled={!ready} className="m-0 grid min-w-0 gap-6 border-0 p-0 transition-opacity disabled:opacity-60 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="surface overflow-hidden">
            <div className="border-b border-slate-100 p-5 dark:border-white/7 sm:p-6">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                <Link2 size={17} className="text-brand-500" />
                媒体链接
              </div>
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value)
                    setInfo(null)
                  }}
                  className="input-base min-h-28 resize-y pr-12 leading-6"
                  placeholder={'粘贴 YouTube、Bilibili、Twitter / X 等 yt-dlp 支持的链接\n每行一个链接，可批量添加'}
                />
                <button className="icon-btn absolute top-2 right-2" onClick={paste} title="从剪贴板粘贴"><Clipboard size={17} /></button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">{urls.length > 1 ? `检测到 ${urls.length} 个链接` : '支持单个视频、播放列表和频道'}</div>
                <button className="btn-secondary" disabled={!urls.length || analyzing} onClick={analyze}>
                  {analyzing ? <Spinner className="size-4" /> : <Search size={16} />}
                  {analyzing ? '正在解析' : '解析链接'}
                </button>
              </div>
            </div>
            {info
              ? <MediaPreview info={info} />
              : (
                  <div className="flex min-h-52 flex-col items-center justify-center p-8 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10"><Sparkles size={22} /></div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">解析链接以预览媒体信息</p>
                    <p className="mt-1 text-xs text-slate-400">你也可以直接选择右侧选项并开始下载</p>
                  </div>
                )}
          </section>

          <section className="surface p-5 xl:hidden sm:p-6">
            <h2 className="section-title mb-5">下载选项</h2>
            <DownloadOptionsForm value={options} onChange={setOptions} allowCustomArgs={settings.allowCustomArgs} />
            <button className="btn-primary mt-6 w-full" disabled={!urls.length || adding} onClick={add}>
              {adding ? <Spinner className="size-4 text-white" /> : <Download size={17} />}
              {adding ? '正在添加…' : '加入下载队列'}
            </button>
          </section>
        </div>

        <aside className="surface sticky top-22 hidden self-start p-5 xl:block">
          <h2 className="section-title mb-5">下载选项</h2>
          <DownloadOptionsForm value={options} onChange={setOptions} allowCustomArgs={settings.allowCustomArgs} />
          <button className="btn-primary mt-6 w-full" disabled={!urls.length || adding} onClick={add}>
            {adding ? <Spinner className="size-4 text-white" /> : <Download size={17} />}
            {adding ? '正在添加…' : '加入下载队列'}
          </button>
        </aside>
      </fieldset>
    </div>
  )
}

function MediaPreview({ info }: { info: MediaInfo }) {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5 sm:w-52">
          {info.thumbnail ? <img className="h-full w-full object-cover" src={info.thumbnail} alt="" referrerPolicy="no-referrer" /> : <div className="flex h-full items-center justify-center text-slate-300"><ListVideo size={32} /></div>}
          {info.duration && <span className="absolute right-2 bottom-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">{formatDuration(info.duration)}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2"><span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-semibold tracking-wide text-brand-700 uppercase dark:bg-brand-500/10 dark:text-brand-300">{info.type === 'playlist' ? 'Playlist' : info.extractor || 'Media'}</span></div>
          <h3 className="line-clamp-2 text-lg font-semibold leading-6 text-slate-900 dark:text-white">{info.title}</h3>
          {info.uploader && <p className="mt-2 text-sm text-slate-500">{info.uploader}</p>}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
            {info.type === 'playlist' && (
              <span>
                {info.playlistCount ?? info.entries?.length ?? 0}
                {' '}
                个条目
              </span>
            )}
            {info.formats.length > 0 && (
              <span>
                {info.formats.length}
                {' '}
                种格式
              </span>
            )}
            {info.subtitles.length > 0 && (
              <span>
                {info.subtitles.length}
                {' '}
                种字幕
              </span>
            )}
            {info.chapters > 0 && (
              <span>
                {info.chapters}
                {' '}
                个章节
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
