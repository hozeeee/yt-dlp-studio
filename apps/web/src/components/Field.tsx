import type { ReactNode } from 'react'

export function Field({ label, hint, actions, children }: { label: string, hint?: ReactNode, actions?: ReactNode, children: ReactNode }) {
  return (
    <label className="block min-w-0">
      {actions
        ? (
            <span className="field-label flex items-center justify-between gap-2">
              <span className="min-w-0">{label}</span>
              <span className="flex shrink-0 items-center gap-0.5">{actions}</span>
            </span>
          )
        : <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs leading-4 text-slate-400">{hint}</span>}
    </label>
  )
}
