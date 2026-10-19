import { describeFormat, FORMAT_PRESETS, FORMAT_TOKENS } from '../lib/formatSelector'
import { TokenField } from './TokenField'

const TOKENS_NOTE = (
  <>
    例如
    <code className="mx-1 rounded bg-slate-100 px-1 font-mono dark:bg-white/8">bv*[height&lt;=1080]+ba/b</code>
    表示：不超过 1080p 的最佳视频合并最佳音频，否则取最佳单文件
  </>
)

export function FormatSelectorField({ value, onChange, disabled }: { value: string, onChange: (value: string) => void, disabled?: boolean }) {
  const preset = describeFormat(value)
  return (
    <TokenField
      label="自定义 format selector"
      hint={preset ? `${preset}，将覆盖清晰度、容器和编码偏好` : '设置后覆盖清晰度、容器和编码偏好'}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="例如：bv*[height<=1080]+ba/b"
      tokens={FORMAT_TOKENS}
      tokensLabel="语法"
      tokensNote={TOKENS_NOTE}
      presets={FORMAT_PRESETS}
    />
  )
}
