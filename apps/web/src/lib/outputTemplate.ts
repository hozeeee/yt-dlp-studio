import type { TokenGroup, TokenPreset } from './tokens'
import { DEFAULT_SETTINGS } from '@yt-dlp-studio/shared'

export interface TemplateVariableGroup extends TokenGroup {
  /** Only meaningful for playlist downloads */
  playlist?: boolean
}

/** Commonly used yt-dlp output template fields, see "OUTPUT TEMPLATE" in the yt-dlp README */
export const TEMPLATE_VARIABLES: TemplateVariableGroup[] = [
  {
    title: '基本信息',
    items: [
      { token: '%(title)s', label: '标题' },
      { token: '%(id)s', label: '视频 ID', description: '同一网站内唯一，适合避免重名' },
      { token: '%(ext)s', label: '扩展名', description: '如 mp4、mp3，模板通常以 .%(ext)s 结尾' },
      { token: '%(uploader)s', label: '上传者' },
      { token: '%(channel)s', label: '频道名称' },
      { token: '%(extractor)s', label: '来源网站', description: '如 youtube、BiliBili' },
    ],
  },
  {
    title: '日期',
    items: [
      { token: '%(upload_date)s', label: '上传日期', description: '格式 YYYYMMDD' },
      { token: '%(upload_date>%Y-%m-%d)s', label: '上传日期（带分隔）', description: '格式 YYYY-MM-DD' },
      { token: '%(upload_date>%Y)s', label: '上传年份' },
      { token: '%(upload_date>%m)s', label: '上传月份' },
    ],
  },
  {
    title: '媒体',
    items: [
      { token: '%(resolution)s', label: '分辨率', description: '如 1920x1080，音频为 audio only' },
      { token: '%(height)sp', label: '清晰度', description: '如 1080p' },
      { token: '%(duration_string)s', label: '时长', description: '如 3:32' },
      { token: '%(format_id)s', label: '格式 ID' },
    ],
  },
  {
    title: '播放列表',
    playlist: true,
    items: [
      { token: '%(playlist_title)s', label: '播放列表标题' },
      { token: '%(playlist_index)03d', label: '序号（补零）', description: '如 001、002，便于按顺序排列' },
      { token: '%(playlist_index)s', label: '序号' },
      { token: '%(playlist_count)s', label: '条目总数' },
      { token: '%(playlist_id)s', label: '播放列表 ID' },
    ],
  },
]

export const SINGLE_PRESETS: TokenPreset[] = [
  { label: '标题 [ID]（默认）', value: DEFAULT_SETTINGS.outputTemplate },
  { label: '仅标题', value: '%(title)s.%(ext)s' },
  { label: '按上传者分目录', value: '%(uploader)s/%(title)s [%(id)s].%(ext)s' },
  { label: '日期 - 标题', value: '%(upload_date>%Y-%m-%d)s - %(title)s [%(id)s].%(ext)s' },
  { label: '按年份分目录', value: '%(upload_date>%Y)s/%(upload_date>%Y-%m-%d)s - %(title)s.%(ext)s' },
]

export const PLAYLIST_PRESETS: TokenPreset[] = [
  { label: '播放列表 / 序号 - 标题 [ID]（默认）', value: DEFAULT_SETTINGS.outputTemplatePlaylist },
  { label: '播放列表 / 序号 - 标题', value: '%(playlist_title)s/%(playlist_index)03d - %(title)s.%(ext)s' },
  { label: '上传者 / 播放列表 / 序号 - 标题', value: '%(uploader)s/%(playlist_title)s/%(playlist_index)03d - %(title)s.%(ext)s' },
  { label: '不分目录，序号 - 标题', value: '%(playlist_index)03d - %(title)s [%(id)s].%(ext)s' },
]

const SAMPLE: Record<string, string | number> = {
  title: '示例视频标题',
  fulltitle: '示例视频标题',
  id: 'dQw4w9WgXcQ',
  ext: 'mp4',
  uploader: '示例频道',
  uploader_id: '@example',
  channel: '示例频道',
  channel_id: 'UCxxxxxxxx',
  extractor: 'youtube',
  extractor_key: 'Youtube',
  webpage_url_domain: 'youtube.com',
  upload_date: '20260101',
  release_date: '20260101',
  resolution: '1920x1080',
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 212,
  duration_string: '3:32',
  format_id: '137+140',
  playlist: '示例播放列表',
  playlist_title: '示例播放列表',
  playlist_id: 'PLxxxxxxxx',
  playlist_index: 1,
  playlist_autonumber: 1,
  playlist_count: 12,
  autonumber: 1,
}

const FIELD_PATTERN = /%\(([^)]*)\)([-#0+ ]*)([1-9]\d*)?(?:\.\d+)?([a-z])/gi

function formatDate(value: string, format: string) {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value)
  if (!match)
    return value
  const [, year, month, day] = match
  return format.replace(/%([YmdyHMS%])/g, (_, code: string) => ({
    'Y': year,
    'y': year.slice(2),
    'm': month,
    'd': day,
    'H': '00',
    'M': '00',
    'S': '00',
    '%': '%',
  })[code] ?? '')
}

function resolveField(expression: string) {
  const [path, fallback] = expression.split('|', 2)
  const [names, dateFormat] = path.split('>', 2)
  for (const name of names.split(',')) {
    const value = SAMPLE[name.trim()]
    if (value != null)
      return dateFormat ? formatDate(String(value), dateFormat) : value
  }
  return fallback ?? 'NA'
}

/** Render a template with sample metadata so users can see the resulting file name */
export function previewTemplate(template: string) {
  return template
    .replace(FIELD_PATTERN, (_, expression: string, flags: string, width: string | undefined, type: string) => {
      const value = resolveField(expression)
      const text = String(type === 'd' && typeof value === 'number' ? Math.trunc(value) : value)
      return width ? text.padStart(Number(width), flags.includes('0') ? '0' : ' ') : text
    })
    .replace(/%%/g, '%')
}

/** Problems that commonly lead to broken file names */
export function lintTemplate(template: string) {
  if (!template.trim())
    return undefined
  if (!template.includes('%(ext)s'))
    return '模板中没有 %(ext)s，文件可能缺少扩展名'
  if (/^\/|^[a-z]:\\/i.test(template))
    return '模板应为相对路径，会保存在下载目录下'
  return undefined
}
