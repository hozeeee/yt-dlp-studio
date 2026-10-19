import type { ReactNode } from 'react'

/** A titled settings card. `extra` sits next to the title (e.g. a HelpTip), `actions` on the right */
export function Section({ title, description, extra, actions, children }: { title: string, description?: ReactNode, extra?: ReactNode, actions?: ReactNode, children: ReactNode }) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="section-title">{title}</h2>
            {extra}
          </div>
          {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}
