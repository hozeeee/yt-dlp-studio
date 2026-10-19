import clsx from 'clsx'
import { LoaderCircle } from 'lucide-react'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={clsx('animate-spin text-brand-500', className)} size={22} />
}

export function FullScreenLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0b0d12]">
      <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-soft dark:bg-white/5"><Spinner /></div>
        正在连接…
      </div>
    </div>
  )
}
