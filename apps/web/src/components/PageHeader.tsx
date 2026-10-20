import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function PageHeader({ title, description, icon: Icon, actions }: { title: string, description: string, icon?: LucideIcon, actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && <div className="hidden size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-xs dark:border-white/8 dark:bg-white/4 dark:text-slate-300 sm:flex"><Icon size={16} /></div>}
        <div className="min-w-0">
          <h1 className="text-lg leading-6 font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h1>
          <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  )
}
