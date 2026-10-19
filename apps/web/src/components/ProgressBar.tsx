import clsx from 'clsx'

/** Determinate bar when `value` is a number (0-100), indeterminate otherwise */
export function ProgressBar({ value, tone = 'brand', className }: { value?: number | null, tone?: 'brand' | 'red' | 'emerald', className?: string }) {
  const color = tone === 'red' ? 'bg-red-500' : tone === 'emerald' ? 'bg-emerald-500' : 'bg-brand-500'
  return (
    <div
      className={clsx('relative h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/8', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
    >
      {value == null
        ? <div className={clsx('animate-indeterminate absolute inset-y-0 w-1/3 rounded-full', color)} />
        : <div className={clsx('h-full rounded-full transition-[width] duration-300', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />}
    </div>
  )
}
