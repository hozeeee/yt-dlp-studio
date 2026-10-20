import type { ReactNode } from 'react'

/** A titled settings card. `extra` sits next to the title (e.g. a HelpTip), `actions` on the right */
export function Section({ title, description, extra, actions, children }: { title: string, description?: ReactNode, extra?: ReactNode, actions?: ReactNode, children: ReactNode }) {
  return (
    <section className="surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="section-title">{title}</h2>
            {extra}
          </div>
          {description && <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-1.5">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}
