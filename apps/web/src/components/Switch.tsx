import clsx from 'clsx'

export function Switch({ checked, onChange, disabled, label }: { checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean, label?: string }) {
  return (
    <label className={clsx('inline-flex items-center gap-2', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
      <input className="peer sr-only" type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
      <span className={clsx('relative h-[18px] w-8 shrink-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40', checked ? 'bg-brand-600 dark:bg-brand-500' : 'bg-slate-300 dark:bg-slate-600')}>
        <span className={clsx('absolute top-0.5 size-3.5 rounded-full bg-white shadow-sm transition-[left]', checked ? 'left-4' : 'left-0.5')} />
      </span>
      {label && <span className="text-[13px] text-slate-700 dark:text-slate-300">{label}</span>}
    </label>
  )
}
