import clsx from 'clsx'
import { AlertTriangle, ArrowRight, Download, Loader2 } from 'lucide-react'
import { Link } from 'react-router'
import { startBinaryJob } from '../lib/binaries'
import { useAppStore } from '../stores/app'
import { BinaryJobProgress } from './BinaryJobProgress'

/**
 * Explains why download features are disabled while yt-dlp is missing,
 * shows install progress and links to the system settings.
 */
export function YtdlpRequired({ feature = '下载', className }: { feature?: string, className?: string }) {
  const status = useAppStore(state => state.system?.binaries.ytdlp)
  if (!status || status.info)
    return null
  const job = status.job
  const running = job?.status === 'running'
  const failed = job?.status === 'error'

  return (
    <div
      role="status"
      className={clsx('flex flex-col gap-3 rounded-xl border px-3.5 py-3 sm:flex-row sm:items-center', running ? 'border-brand-200 bg-brand-50/70 dark:border-brand-500/20 dark:bg-brand-500/8' : 'border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/8', className)}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <div className={clsx('flex size-7 shrink-0 items-center justify-center rounded-lg', running ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300')}>
          {running ? <Loader2 size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{running ? '正在安装 yt-dlp…' : '尚未安装 yt-dlp'}</div>
          {running && job
            ? <BinaryJobProgress job={job} compact />
            : (
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">
                  {`${feature}功能依赖 yt-dlp，安装完成前相关操作已禁用。`}
                  {failed && job?.error && <span className="mt-1 block text-red-600 dark:text-red-400">{`上次安装失败：${job.error}`}</span>}
                </p>
              )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        {!running && status.installable && (
          <button className="btn-primary" onClick={() => startBinaryJob('ytdlp', 'install')}>
            <Download />
            {failed ? '重试安装' : '一键安装'}
          </button>
        )}
        <Link className="btn-secondary" to="/settings?tab=system">
          {running ? '查看详情' : '前往设置'}
          <ArrowRight />
        </Link>
      </div>
    </div>
  )
}
