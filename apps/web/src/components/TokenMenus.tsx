import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TokenGroup, TokenPreset } from '../lib/tokens'
import { DropdownMenu } from 'radix-ui'
import { Fragment, useRef } from 'react'

const CONTENT_CLASS = 'animate-pop-in z-[70] max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-float outline-none dark:border-white/10 dark:bg-[#1a1e27]'
const ITEM_CLASS = 'flex cursor-pointer flex-col gap-0.5 rounded-lg px-2.5 py-2 outline-none select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-white/7'
const LABEL_CLASS = 'px-2.5 pt-2 pb-1 text-xs font-medium text-slate-400'
const TRIGGER_CLASS = 'inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-45 data-[state=open]:bg-brand-50 data-[state=open]:text-brand-600 dark:text-slate-400 dark:hover:bg-white/7 dark:hover:text-brand-400 dark:data-[state=open]:bg-brand-500/10 dark:data-[state=open]:text-brand-400'

interface MenuProps {
  label: string
  icon: LucideIcon
  /** Called after the menu closed because an item was picked, to move focus back to the input */
  onClosed: () => void
  disabled?: boolean
}

/** Radix returns focus to the trigger on close; after picking an item the input should get it instead */
function useFocusAfterPick(onClosed: () => void) {
  const pickedRef = useRef(false)
  return {
    pick: (action: () => void) => () => {
      pickedRef.current = true
      action()
    },
    onCloseAutoFocus: (event: Event) => {
      if (!pickedRef.current)
        return
      pickedRef.current = false
      event.preventDefault()
      onClosed()
    },
  }
}

function Menu({ label, icon: Icon, disabled, onCloseAutoFocus, children }: Omit<MenuProps, 'onClosed'> & { onCloseAutoFocus: (event: Event) => void, children: ReactNode }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={TRIGGER_CLASS} disabled={disabled}>
        <Icon size={14} />
        {label}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={CONTENT_CLASS} align="end" sideOffset={6} collisionPadding={12} onCloseAutoFocus={onCloseAutoFocus}>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/** Grouped snippets inserted at the caret */
export function InsertMenu({ groups, note, onPick, onClosed, ...props }: MenuProps & { groups: TokenGroup[], note?: ReactNode, onPick: (token: string) => void }) {
  const { pick, onCloseAutoFocus } = useFocusAfterPick(onClosed)
  return (
    <Menu {...props} onCloseAutoFocus={onCloseAutoFocus}>
      {note && <div className="px-2.5 pt-1.5 pb-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{note}</div>}
      {groups.map((group, index) => (
        <Fragment key={group.title}>
          {index > 0 && <DropdownMenu.Separator className="my-1 h-px bg-slate-100 dark:bg-white/8" />}
          <DropdownMenu.Group>
            <DropdownMenu.Label className={LABEL_CLASS}>{group.title}</DropdownMenu.Label>
            {group.items.map(item => (
              <DropdownMenu.Item key={item.token} className={ITEM_CLASS} onSelect={pick(() => onPick(item.token))}>
                <span className="flex items-center justify-between gap-3">
                  <span className="text-slate-700 dark:text-slate-200">{item.label}</span>
                  <code className="truncate font-mono text-xs text-brand-600 dark:text-brand-400">{item.token}</code>
                </span>
                {item.description && <span className="text-xs text-slate-400">{item.description}</span>}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Group>
        </Fragment>
      ))}
    </Menu>
  )
}

/** Complete values replacing the input content */
export function PresetMenu({ presets, title, current, onPick, onClosed, ...props }: MenuProps & { presets: TokenPreset[], title: string, current: string, onPick: (value: string) => void }) {
  const { pick, onCloseAutoFocus } = useFocusAfterPick(onClosed)
  return (
    <Menu {...props} onCloseAutoFocus={onCloseAutoFocus}>
      <DropdownMenu.Label className={LABEL_CLASS}>{title}</DropdownMenu.Label>
      {presets.map(preset => (
        <DropdownMenu.Item key={preset.value} className={ITEM_CLASS} onSelect={pick(() => onPick(preset.value))}>
          <span className="flex items-center justify-between gap-3 text-slate-700 dark:text-slate-200">
            {preset.label}
            {preset.value === current && <span className="shrink-0 text-xs text-brand-600 dark:text-brand-400">当前</span>}
          </span>
          {preset.description && <span className="text-xs text-slate-400">{preset.description}</span>}
          <span className="font-mono text-xs break-all text-slate-400">{preset.detail ?? preset.value}</span>
        </DropdownMenu.Item>
      ))}
    </Menu>
  )
}
