import clsx from 'clsx'

export function Switch({ checked, onChange, disabled, label }: { checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean, label?: string }) {
  return (
    <label className={clsx('inline-flex items-center gap-2.5', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
      <input className="sr-only" type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
      <span className={clsx('relative h-6 w-10 rounded-full transition', checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600')}>
        <span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
      {label && <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>}
    </label>
  )
}
