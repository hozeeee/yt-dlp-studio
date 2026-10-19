import type { ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useRef, useState } from 'react'

/**
 * A "?" help bubble. Opens on hover for pointer devices and on tap for touch,
 * and (unlike a plain tooltip) may contain links.
 */
export function HelpTip({ children, label = '帮助', width = 'w-80' }: { children: ReactNode, label?: string, width?: string }) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)
  const hover = (next: boolean) => (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse')
      return
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(setOpen, next ? 120 : 200, next)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="inline-flex size-5 items-center justify-center rounded-full text-slate-400 transition hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none dark:hover:text-brand-400"
        aria-label={label}
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
      >
        <CircleHelp size={16} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onPointerEnter={hover(true)}
          onPointerLeave={hover(false)}
          className={`animate-pop-in z-[70] max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-float outline-none dark:border-white/10 dark:bg-[#1a1e27] dark:text-slate-300 ${width}`}
        >
          {children}
          <Popover.Arrow className="fill-white dark:fill-[#1a1e27]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
