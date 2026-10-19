import type { ReactNode } from 'react'
import { lintTemplate, PLAYLIST_PRESETS, previewTemplate, SINGLE_PRESETS, TEMPLATE_VARIABLES } from '../lib/outputTemplate'
import { TokenField } from './TokenField'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  /**
   * `single` hides playlist fields, `playlist` lists them first,
   * `any` is for overrides that apply to both kinds of downloads.
   */
  scope: 'single' | 'playlist' | 'any'
  placeholder?: string
  /** Shown instead of the preview while the input is empty */
  emptyHint?: ReactNode
  disabled?: boolean
}

function variableGroups(scope: Props['scope']) {
  if (scope === 'single')
    return TEMPLATE_VARIABLES.filter(group => !group.playlist)
  if (scope === 'playlist')
    return [...TEMPLATE_VARIABLES.filter(group => group.playlist), ...TEMPLATE_VARIABLES.filter(group => !group.playlist)]
  return TEMPLATE_VARIABLES.map(group => group.playlist ? { ...group, title: `${group.title}（仅播放列表条目有效）` } : group)
}

function presetsOf(scope: Props['scope']) {
  const presets = scope === 'single' ? SINGLE_PRESETS : scope === 'playlist' ? PLAYLIST_PRESETS : [...SINGLE_PRESETS, ...PLAYLIST_PRESETS]
  return presets.map(preset => ({ ...preset, detail: previewTemplate(preset.value) }))
}

const VARIABLES_NOTE = (
  <>
    点击插入到光标处，可用
    <code className="mx-1 rounded bg-slate-100 px-1 font-mono dark:bg-white/8">/</code>
    分隔子目录
  </>
)

export function OutputTemplateField({ label, value, onChange, scope, placeholder, emptyHint, disabled }: Props) {
  const warning = lintTemplate(value)
  const hint = value.trim()
    ? (
        <span className="flex flex-col gap-0.5">
          <span className="break-all">
            预览：
            <span className="font-mono text-slate-500 dark:text-slate-400">{previewTemplate(value)}</span>
          </span>
          {warning && <span className="text-amber-600 dark:text-amber-400">{warning}</span>}
        </span>
      )
    : emptyHint

  return (
    <TokenField
      label={label}
      hint={hint}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      tokens={variableGroups(scope)}
      tokensNote={VARIABLES_NOTE}
      presets={presetsOf(scope)}
      presetsTitle="常用模板（将替换当前内容）"
    />
  )
}
