import type { ReactNode } from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
}

/**
 * Accessible dialog rendered in a portal (never clipped by page layout).
 * Header and footer stay fixed while the body scrolls.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={next => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-in fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px]" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-5">
          <Dialog.Content
            className={clsx(
              'animate-dialog-in pointer-events-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200/70 bg-white shadow-float outline-none dark:border-white/10 dark:bg-[#15171d] sm:max-h-[min(88dvh,56rem)] sm:rounded-xl',
              SIZES[size],
            )}
          >
            <header className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/7 sm:px-5">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="truncate text-[15px] leading-6 font-semibold text-slate-950 dark:text-white">{title}</Dialog.Title>
                {description
                  ? <Dialog.Description className="text-[13px] text-slate-500 dark:text-slate-400">{description}</Dialog.Description>
                  : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
              </div>
              <Dialog.Close className="icon-btn -mr-1.5 shrink-0" aria-label="关闭"><X /></Dialog.Close>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>
            {footer && <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/7 dark:bg-white/2 sm:px-5 sm:pb-3">{footer}</footer>}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
