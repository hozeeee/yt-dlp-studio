import clsx from 'clsx'
import { Download } from 'lucide-react'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-blue-700 text-white shadow-lg shadow-brand-600/20">
        <Download size={19} strokeWidth={2.5} />
        <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-[#12151c]" />
      </div>
      <div className={clsx('min-w-0', compact && 'hidden')}>
        <div className="truncate text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">yt-dlp Studio</div>
        <div className="text-[10px] font-medium tracking-[0.14em] text-slate-400 uppercase">Media workspace</div>
      </div>
    </div>
  )
}
