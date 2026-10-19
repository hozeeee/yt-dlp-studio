import type { DownloadOptions } from '@yt-dlp-studio/shared'
import clsx from 'clsx'
import { ChevronDown, FileAudio, FileImage, Film, Settings2 } from 'lucide-react'
import { CookieSelect } from './CookieSelect'
import { Field } from './Field'
import { Switch } from './Switch'

interface Props {
  value: DownloadOptions
  onChange: (value: DownloadOptions) => void
  compact?: boolean
  allowCustomArgs?: boolean
  /** Link being downloaded, helps picking the matching cookies file */
  url?: string
}

export function DownloadOptionsForm({ value, onChange, compact, allowCustomArgs, url }: Props) {
  const set = <K extends keyof DownloadOptions>(key: K, next: DownloadOptions[K]) => onChange({ ...value, [key]: next })
  const kinds = [
    { id: 'video' as const, label: '视频', icon: Film },
    { id: 'audio' as const, label: '音频', icon: FileAudio },
    { id: 'thumbnail' as const, label: '封面', icon: FileImage },
  ]

  return (
    <div className="space-y-5">
      <div>
        <label className="field-label">下载类型</label>
        <div className="grid grid-cols-3 gap-2">
          {kinds.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => set('kind', id)} className={clsx('flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition', value.kind === id ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/10 dark:bg-brand-500/10 dark:text-brand-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5')}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {value.kind === 'video' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="清晰度">
            <select className="input-base" value={value.quality} onChange={event => set('quality', event.target.value as DownloadOptions['quality'])}>
              <option value="best">最佳可用</option>
              <option value="2160">4K / 2160p</option>
              <option value="1440">2K / 1440p</option>
              <option value="1080">1080p</option>
              <option value="720">720p</option>
              <option value="480">480p</option>
              <option value="360">360p</option>
            </select>
          </Field>
          <Field label="容器">
            <select className="input-base" value={value.container} onChange={event => set('container', event.target.value as DownloadOptions['container'])}>
              <option value="auto">自动</option>
              <option value="mp4">MP4</option>
              <option value="mkv">MKV</option>
              <option value="webm">WebM</option>
            </select>
          </Field>
          <Field label="视频编码">
            <select className="input-base" value={value.codec} onChange={event => set('codec', event.target.value as DownloadOptions['codec'])}>
              <option value="auto">自动</option>
              <option value="h264">H.264</option>
              <option value="h265">H.265 / HEVC</option>
              <option value="av1">AV1</option>
              <option value="vp9">VP9</option>
            </select>
          </Field>
        </div>
      )}

      {value.kind === 'audio' && (
        <Field label="音频格式">
          <select className="input-base sm:max-w-xs" value={value.audioFormat} onChange={event => set('audioFormat', event.target.value as DownloadOptions['audioFormat'])}>
            <option value="best">最佳 / 原始格式</option>
            <option value="mp3">MP3</option>
            <option value="m4a">M4A</option>
            <option value="opus">Opus</option>
            <option value="flac">FLAC</option>
            <option value="wav">WAV</option>
          </select>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="保存到子目录" hint="相对于下载目录">
          <input className="input-base" value={value.folder ?? ''} onChange={event => set('folder', event.target.value)} placeholder="例如：音乐/收藏" />
        </Field>
        {!compact && (
          <Field label="播放列表条目上限" hint="0 表示全部">
            <input className="input-base" type="number" min="0" value={value.playlistLimit} onChange={event => set('playlistLimit', Math.max(0, Number(event.target.value)))} />
          </Field>
        )}
      </div>

      <CookieSelect value={value.cookies} onChange={next => set('cookies', next)} url={url} />

      {!compact && (
        <details className="group rounded-xl border border-slate-200/80 dark:border-white/8">
          <summary className="flex list-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <Settings2 size={16} />
              高级选项
            </span>
            <ChevronDown className="transition group-open:rotate-180" size={16} />
          </summary>
          <div className="space-y-5 border-t border-slate-100 p-4 dark:border-white/7">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="自定义 format selector" hint="设置后覆盖清晰度、容器和编码偏好">
                <input className="input-base font-mono text-xs" value={value.format ?? ''} onChange={event => set('format', event.target.value)} placeholder="例如：bv*[height<=1080]+ba/b" />
              </Field>
              <Field label="下载时间段" hint="需要 ffmpeg，例如 00:01:00-00:02:30">
                <input className="input-base font-mono text-xs" value={value.section ?? ''} onChange={event => set('section', event.target.value)} placeholder="*00:01:00-00:02:30" />
              </Field>
              <Field label="输出模板" hint="留空时使用全局设置">
                <input className="input-base font-mono text-xs" value={value.outputTemplate ?? ''} onChange={event => set('outputTemplate', event.target.value)} placeholder="%(title)s [%(id)s].%(ext)s" />
              </Field>
              {value.subtitles && (
                <Field label="字幕语言" hint="支持 yt-dlp 语言匹配表达式">
                  <input className="input-base" value={value.subtitleLangs} onChange={event => set('subtitleLangs', event.target.value)} placeholder="zh.*,en.*" />
                </Field>
              )}
            </div>

            {value.kind !== 'thumbnail' && (
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Switch checked={value.subtitles} onChange={next => set('subtitles', next)} label="下载字幕与自动字幕" />
                <Switch checked={value.embedSubtitles} onChange={next => set('embedSubtitles', next)} label="嵌入字幕" />
                <Switch checked={value.embedMetadata} onChange={next => set('embedMetadata', next)} label="嵌入元数据" />
                <Switch checked={value.embedThumbnail} onChange={next => set('embedThumbnail', next)} label="嵌入封面" />
                <Switch checked={value.writeThumbnail} onChange={next => set('writeThumbnail', next)} label="单独保存封面" />
                <Switch checked={value.embedChapters} onChange={next => set('embedChapters', next)} label="嵌入章节" />
                <Switch checked={value.splitChapters} onChange={next => set('splitChapters', next)} label="按章节拆分" />
                <Switch checked={value.sponsorBlock} onChange={next => set('sponsorBlock', next)} label="SponsorBlock 移除赞助片段" />
              </div>
            )}

            {allowCustomArgs && (
              <Field label="额外 yt-dlp 参数" hint="仅可信用户使用，会直接传递到 yt-dlp">
                <input className="input-base font-mono text-xs" value={value.extraArgs ?? ''} onChange={event => set('extraArgs', event.target.value)} placeholder="--write-info-json" />
              </Field>
            )}
          </div>
        </details>
      )}
    </div>
  )
}
