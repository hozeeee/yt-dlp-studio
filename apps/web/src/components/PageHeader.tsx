import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function PageHeader({ title, description, icon: Icon, actions }: { title: string, description: string, icon?: LucideIcon, actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && <div className="mt-0.5 hidden size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 sm:flex"><Icon size={20} /></div>}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
