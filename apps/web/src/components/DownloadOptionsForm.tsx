import type { DownloadOptions } from '@yt-dlp-studio/shared'
import { ChevronDown, FileAudio, FileImage, Film, Settings2 } from 'lucide-react'
import { CookieSelect } from './CookieSelect'
import { Field } from './Field'
import { FormatSelectorField } from './FormatSelectorField'
import { OutputTemplateField } from './OutputTemplateField'
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
    // Sized by its container: the form lives in a narrow sidebar, dialogs and the wide settings page
    <div className="@container space-y-4">
      <div>
        <label className="field-label">下载类型</label>
        <div className="segmented grid w-full grid-cols-3">
          {kinds.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" data-active={value.kind === id} onClick={() => set('kind', id)} className="segmented-item">
              <Icon />
              {label}
            </button>
          ))}
        </div>
      </div>

      {value.kind === 'video' && (
        <div className="grid gap-3 @xs:grid-cols-3">
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
          <select className="input-base @md:max-w-xs" value={value.audioFormat} onChange={event => set('audioFormat', event.target.value as DownloadOptions['audioFormat'])}>
            <option value="best">最佳 / 原始格式</option>
            <option value="mp3">MP3</option>
            <option value="m4a">M4A</option>
            <option value="opus">Opus</option>
            <option value="flac">FLAC</option>
            <option value="wav">WAV</option>
          </select>
        </Field>
      )}

      <div className="grid gap-3 @md:grid-cols-2">
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
        <details className="group rounded-lg border border-slate-200/80 dark:border-white/8">
          <summary className="flex h-9 list-none items-center justify-between rounded-lg px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/3 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Settings2 size={15} />
              高级选项
            </span>
            <ChevronDown className="text-slate-400 transition group-open:rotate-180" size={15} />
          </summary>
          <div className="space-y-4 border-t border-slate-100 p-3 dark:border-white/7">
            <div className="grid gap-3 @2xl:grid-cols-2">
              <FormatSelectorField value={value.format ?? ''} onChange={next => set('format', next)} />
              <Field label="下载时间段" hint="需要 ffmpeg，例如 00:01:00-00:02:30">
                <input className="input-base font-mono text-xs" value={value.section ?? ''} onChange={event => set('section', event.target.value)} placeholder="00:01:00-00:02:30" />
              </Field>
              <OutputTemplateField label="输出模板" scope="any" value={value.outputTemplate ?? ''} onChange={next => set('outputTemplate', next)} placeholder="留空时使用全局设置" emptyHint="留空时使用全局设置" />
              {value.subtitles && (
                <Field label="字幕语言" hint="支持 yt-dlp 语言匹配表达式">
                  <input className="input-base" value={value.subtitleLangs} onChange={event => set('subtitleLangs', event.target.value)} placeholder="zh.*,en.*" />
                </Field>
              )}
            </div>

            {value.kind !== 'thumbnail' && (
              <div className="grid gap-x-6 gap-y-2.5 @xs:grid-cols-2">
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
