import type { AddDownloadsResponse, DownloadOptions, MediaInfo } from '@yt-dlp-studio/shared'
import type { PreviewState } from './download/PreviewPanel'
import { Clipboard, Download, Eye, Link2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { DownloadOptionsForm } from '../components/DownloadOptionsForm'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { YtdlpRequired } from '../components/YtdlpRequired'
import { api, json } from '../lib/api'
import { useYtdlpReady } from '../lib/binaries'
import { useAppStore } from '../stores/app'
import { toast } from '../stores/toast'
import { PreviewPanel } from './download/PreviewPanel'

export function DownloadPage() {
  const settings = useAppStore(state => state.settings)!
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' })
  const [options, setOptions] = useState<DownloadOptions>({ ...settings.defaultOptions })
  const [adding, setAdding] = useState(false)
  const previewAbortRef = useRef<AbortController | null>(null)
  const navigate = useNavigate()
  const ready = useYtdlpReady()
  const urls = input.split(/\s+/).map(value => value.trim()).filter(Boolean)
  const analyzing = preview.status === 'loading'

  // Leaving the page stops the preview, the server then kills yt-dlp
  useEffect(() => () => previewAbortRef.current?.abort(), [])

  function resetPreview() {
    previewAbortRef.current?.abort()
    previewAbortRef.current = null
    setPreview({ status: 'idle' })
  }

  async function paste() {
    try {
      setInput(await navigator.clipboard.readText())
      resetPreview()
    }
    catch {
      toast.error('无法读取剪贴板', '请手动粘贴链接')
    }
  }

  async function analyze() {
    if (!urls[0] || !ready)
      return
    previewAbortRef.current?.abort()
    const controller = new AbortController()
    previewAbortRef.current = controller
    setPreview({ status: 'loading', startedAt: Date.now() })
    try {
      const media = await api<MediaInfo>('/info', { ...json('POST', { url: urls[0], flat: true, cookies: options.cookies }), signal: controller.signal })
      if (!controller.signal.aborted)
        setPreview({ status: 'done', info: media })
    }
    catch (error) {
      if (!controller.signal.aborted)
        setPreview({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    }
    finally {
      if (previewAbortRef.current === controller)
        previewAbortRef.current = null
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
      resetPreview()
      navigate('/tasks')
    }
    catch (error) {
      toast.error('添加失败', error instanceof Error ? error.message : String(error))
    }
    finally {
      setAdding(false)
    }
  }

  const optionsPanel = (
    <>
      <div className="border-b border-slate-100 px-4 py-3 dark:border-white/6"><h2 className="section-title">下载选项</h2></div>
      <div className="p-4">
        <DownloadOptionsForm value={options} onChange={setOptions} allowCustomArgs={settings.allowCustomArgs} url={urls[0]} />
        <button className="btn-primary mt-4 h-9 w-full" disabled={!urls.length || adding} onClick={add}>
          {adding ? <Spinner className="text-white" /> : <Download />}
          {adding ? '正在读取链接并添加…' : '加入下载队列'}
        </button>
      </div>
    </>
  )

  return (
    <div className="page-enter">
      <PageHeader title="新建下载" description="粘贴一个或多个媒体链接，选择下载选项后加入下载队列。" icon={Download} />
      <YtdlpRequired className="mb-4" />
      {/* A disabled fieldset disables every control inside it while yt-dlp is missing */}
      <fieldset disabled={!ready} className="m-0 grid min-w-0 gap-4 border-0 p-0 transition-opacity disabled:opacity-60 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="surface overflow-hidden">
            <div className="border-b border-slate-100 p-4 dark:border-white/6">
              <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                <Link2 size={15} className="text-brand-500" />
                媒体链接
              </div>
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value)
                    resetPreview()
                  }}
                  className="input-base min-h-24 resize-y py-2 pr-10"
                  placeholder={'粘贴 YouTube、Bilibili、Twitter / X 等 yt-dlp 支持的链接\n每行一个链接，可批量添加'}
                />
                <button className="icon-btn absolute top-1 right-1" onClick={paste} title="从剪贴板粘贴"><Clipboard /></button>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-400">{urls.length > 1 ? `检测到 ${urls.length} 个链接，预览只读取第一个` : '支持单个视频、播放列表和频道'}</div>
                <button className="btn-secondary" disabled={!urls.length || analyzing} onClick={analyze} title="读取标题、时长、格式等信息，不会下载">
                  {analyzing ? <Spinner /> : <Eye />}
                  {analyzing ? '正在读取' : '预览信息'}
                </button>
              </div>
            </div>
            <PreviewPanel state={preview} onCancel={resetPreview} />
          </section>

          <section className="surface xl:hidden">{optionsPanel}</section>
        </div>

        <aside className="surface sticky top-5 hidden self-start xl:block">{optionsPanel}</aside>
      </fieldset>
    </div>
  )
}
