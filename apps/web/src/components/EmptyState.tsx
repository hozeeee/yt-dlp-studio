import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon, title: string, description: string, action?: ReactNode }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/6 dark:text-slate-500">
        <Icon size={25} strokeWidth={1.7} />
      </div>
      <h3 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
