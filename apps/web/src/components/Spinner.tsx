import clsx from 'clsx'
import { LoaderCircle } from 'lucide-react'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={clsx('animate-spin text-brand-500', className)} size={20} />
}

export function FullScreenLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] dark:bg-[#0b0c10]">
      <div className="flex flex-col items-center gap-3 text-[13px] text-slate-500">
        <div className="flex size-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-soft dark:border-white/8 dark:bg-white/5"><Spinner /></div>
        正在连接…
      </div>
    </div>
  )
}
