import type { ReactNode } from 'react'

export function Field({ label, hint, children }: { label: string, hint?: ReactNode, children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}
