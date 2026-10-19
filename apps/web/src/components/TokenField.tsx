import type { ReactNode } from 'react'
import type { TokenGroup, TokenPreset } from '../lib/tokens'
import { Braces, LayoutTemplate } from 'lucide-react'
import { useRef } from 'react'
import { Field } from './Field'
import { InsertMenu, PresetMenu } from './TokenMenus'

interface Props {
  label: string
  hint?: ReactNode
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** Snippets inserted at the caret */
  tokens: TokenGroup[]
  tokensLabel?: string
  tokensNote?: ReactNode
  /** Complete values replacing the content */
  presets: TokenPreset[]
  presetsTitle?: string
}

/** A monospace expression input with "insert snippet" and "pick preset" menus next to its label */
export function TokenField({ label, hint, value, onChange, placeholder, disabled, tokens, tokensLabel = '变量', tokensNote, presets, presetsTitle = '常用（将替换当前内容）' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  /** Last caret range; `null` until the user touched the input, then snippets are appended */
  const caretRef = useRef<[number, number] | null>(null)
  const pendingCaretRef = useRef<number | undefined>(undefined)

  const rememberCaret = () => {
    const input = inputRef.current
    if (input && document.activeElement === input)
      caretRef.current = [input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length]
  }

  const insert = (token: string) => {
    const [start, end] = caretRef.current ?? [value.length, value.length]
    onChange(value.slice(0, start) + token + value.slice(end))
    pendingCaretRef.current = start + token.length
  }

  const replace = (next: string) => {
    onChange(next)
    pendingCaretRef.current = next.length
  }

  const focusInput = () => {
    const input = inputRef.current
    const caret = pendingCaretRef.current
    if (!input)
      return
    input.focus()
    if (caret !== undefined) {
      input.setSelectionRange(caret, caret)
      caretRef.current = [caret, caret]
      pendingCaretRef.current = undefined
    }
  }

  const actions = (
    <>
      <InsertMenu label={tokensLabel} icon={Braces} groups={tokens} note={tokensNote} onPick={insert} onClosed={focusInput} disabled={disabled} />
      <PresetMenu label="常用" icon={LayoutTemplate} title={presetsTitle} presets={presets} current={value} onPick={replace} onClosed={focusInput} disabled={disabled} />
    </>
  )

  return (
    <Field label={label} hint={hint} actions={actions}>
      <input
        ref={inputRef}
        className="input-base font-mono text-xs"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(event) => {
          onChange(event.target.value)
          rememberCaret()
        }}
        onSelect={rememberCaret}
      />
    </Field>
  )
}
