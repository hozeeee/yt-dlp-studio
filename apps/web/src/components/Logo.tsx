import clsx from 'clsx'
import { Download } from 'lucide-react'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-blue-700 text-white shadow-sm shadow-brand-600/20">
        <Download size={15} strokeWidth={2.5} />
        <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full border-[1.5px] border-white bg-emerald-400 dark:border-[#0f1115]" />
      </div>
      <div className={clsx('min-w-0 leading-tight', compact && 'hidden')}>
        <div className="truncate text-sm font-semibold tracking-tight text-slate-950 dark:text-white">yt-dlp Studio</div>
        <div className="text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">Media workspace</div>
      </div>
    </div>
  )
}
