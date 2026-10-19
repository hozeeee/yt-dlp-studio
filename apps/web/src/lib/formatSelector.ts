import type { TokenGroup, TokenPreset } from './tokens'

/** Building blocks of a yt-dlp format selector, see "FORMAT SELECTION" in the yt-dlp README */
export const FORMAT_TOKENS: TokenGroup[] = [
  {
    title: '选择格式',
    items: [
      { token: 'bv*', label: '最佳视频', description: '画质最高的视频格式，可能已包含音频' },
      { token: 'bv', label: '最佳纯视频流', description: '不含音频，通常需要再用 + 合并音频' },
      { token: 'ba', label: '最佳音频', description: '音质最高的纯音频流' },
      { token: 'b', label: '最佳音视频合一文件', description: '无需合并，但部分网站上画质较低' },
      { token: 'wv*', label: '最差视频', description: '体积最小的视频' },
      { token: 'wa', label: '最差音频', description: '体积最小的音频' },
    ],
  },
  {
    title: '组合',
    items: [
      { token: '+', label: '合并', description: '把视频和音频合并为一个文件，需要 ffmpeg' },
      { token: '/', label: '否则', description: '前面的格式不可用时，改用后面的' },
      { token: ',', label: '同时下载', description: '分别下载多个格式' },
    ],
  },
  {
    title: '筛选条件（写在格式后面，如 bv*[height<=1080]）',
    items: [
      { token: '[height<=1080]', label: '不超过 1080p' },
      { token: '[height<=720]', label: '不超过 720p' },
      { token: '[fps<=30]', label: '帧率不超过 30' },
      { token: '[ext=mp4]', label: '视频为 MP4' },
      { token: '[ext=m4a]', label: '音频为 M4A' },
      { token: '[vcodec^=avc]', label: 'H.264 编码', description: '兼容性最好' },
      { token: '[vcodec^=av01]', label: 'AV1 编码' },
      { token: '[language^=zh]', label: '中文音轨', description: '仅部分网站提供多语言音轨' },
      { token: '[filesize<500M]', label: '小于 500 MB', description: '大小未知的格式会被排除' },
    ],
  },
]

export const FORMAT_PRESETS: TokenPreset[] = [
  { label: '最佳画质', value: 'bv*+ba/b', description: '下载视频且留空时的默认值' },
  { label: '不超过 1080p', value: 'bv*[height<=1080]+ba/b[height<=1080]' },
  { label: '不超过 720p', value: 'bv*[height<=720]+ba/b[height<=720]' },
  { label: '优先 MP4 / M4A', value: 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b', description: '方便在更多设备上直接播放' },
  { label: '优先 H.264 编码', value: 'bv*[vcodec^=avc]+ba/b', description: '兼容老设备和剪辑软件' },
  { label: '单文件，不合并', value: 'b', description: '不需要 ffmpeg，画质可能较低' },
  { label: '体积最小', value: 'wv*+wa/w' },
  { label: '仅音频', value: 'ba/b' },
]

/** Explain the value when it is one of the presets */
export function describeFormat(value: string) {
  return FORMAT_PRESETS.find(preset => preset.value === value.trim())?.label
}
