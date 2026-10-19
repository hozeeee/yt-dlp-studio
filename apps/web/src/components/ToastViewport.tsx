import clsx from 'clsx'
import { X } from 'lucide-react'
import { TOAST_ICONS, useToastStore } from '../stores/toast'

export function ToastViewport() {
  const { items, remove } = useToastStore()
  return (
    <div className="pointer-events-none fixed right-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[80] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-5 lg:bottom-5">
      {items.map((item) => {
        const Icon = TOAST_ICONS[item.kind]
        return (
          <div key={item.id} className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-float backdrop-blur dark:border-white/10 dark:bg-[#191c24]/95">
            <Icon className={clsx('mt-0.5 shrink-0', item.kind === 'success' && 'text-emerald-500', item.kind === 'error' && 'text-red-500', item.kind === 'warning' && 'text-amber-500', item.kind === 'info' && 'text-brand-500')} size={19} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</div>
              {item.message && <div className="mt-0.5 line-clamp-6 break-words whitespace-pre-line text-xs leading-5 text-slate-500 dark:text-slate-400">{item.message}</div>}
            </div>
            <button className="-mr-1 text-slate-400 hover:text-slate-700 dark:hover:text-white" onClick={() => remove(item.id)}><X size={16} /></button>
          </div>
        )
      })}
    </div>
  )
}
