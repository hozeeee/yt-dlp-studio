import type { MediaInfo } from '@yt-dlp-studio/shared'
import type { ReactNode } from 'react'
import { AlertCircle, Eye, ListVideo, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Spinner } from '../../components/Spinner'
import { formatDuration } from '../../lib/format'

export type PreviewState
  = | { status: 'idle' }
    | { status: 'loading', startedAt: number }
    | { status: 'error', message: string }
    | { status: 'done', info: MediaInfo }

interface Props {
  state: PreviewState
  onCancel: () => void
}

export function PreviewPanel({ state, onCancel }: Props) {
  if (state.status === 'loading')
    return <PreviewLoading startedAt={state.startedAt} onCancel={onCancel} />
  if (state.status === 'error')
    return <PreviewError message={state.message} />
  if (state.status === 'done')
    return <MediaPreview info={state.info} />
  return (
    <Placeholder icon={<Eye size={22} />}>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">可选：先预览链接内容</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
        「预览信息」只读取标题、时长、格式和播放列表条目，不会下载任何文件。
        确认无误后点击「加入下载队列」才会真正开始下载，也可以跳过预览直接下载。
      </p>
    </Placeholder>
  )
}

function Placeholder({ icon, tone = 'brand', children }: { icon: ReactNode, tone?: 'brand' | 'danger', children: ReactNode }) {
  const iconClass = tone === 'danger'
    ? 'bg-red-50 text-red-500 dark:bg-red-500/10'
    : 'bg-brand-50 text-brand-500 dark:bg-brand-500/10'
  return (
    <div className="flex min-h-52 flex-col items-center justify-center p-8 text-center">
      <div className={`mb-3 flex size-12 items-center justify-center rounded-2xl ${iconClass}`}>{icon}</div>
      {children}
    </div>
  )
}

function PreviewLoading({ startedAt, onCancel }: { startedAt: number, onCancel: () => void }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  return (
    <Placeholder icon={<Spinner className="size-5" />}>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{`yt-dlp 正在读取媒体信息… ${seconds}s`}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
        {seconds < 15
          ? '通常需要几秒钟，不会下载文件。'
          : '耗时较长，可能是播放列表 / 频道条目较多，或网络较慢（可在设置中配置代理）。'}
      </p>
      <button type="button" className="btn-secondary mt-4 py-1.5 text-xs" onClick={onCancel}>
        <X size={14} />
        取消预览
      </button>
    </Placeholder>
  )
}

function PreviewError({ message }: { message: string }) {
  return (
    <Placeholder icon={<AlertCircle size={22} />} tone="danger">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">无法读取该链接</p>
      <pre className="mt-3 max-h-40 w-full max-w-xl overflow-auto rounded-xl bg-slate-50 p-3 text-left font-mono text-xs leading-5 whitespace-pre-wrap text-red-600 dark:bg-white/5 dark:text-red-400">{message}</pre>
      <p className="mt-3 max-w-md text-xs leading-5 text-slate-400">需要登录的内容请在右侧选择对应网站的 Cookie 后重试。</p>
    </Placeholder>
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
          <p className="mt-4 text-xs text-slate-400">预览完成，尚未下载。确认选项后点击「加入下载队列」开始下载。</p>
        </div>
      </div>
    </div>
  )
}
