import type { BinaryJob, BinaryName } from '@yt-dlp-studio/shared'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'
import { Link } from 'react-router'
import { actionLabel, BINARY_LABELS, jobPercent } from '../lib/binaries'
import { useAppStore } from '../stores/app'

const NAMES: BinaryName[] = ['ytdlp', 'ffmpeg']

/** Pill for installs running in the background, shown in the shell so it is visible from every page */
export function BinaryJobIndicator({ className }: { className?: string }) {
  const binaries = useAppStore(state => state.system?.binaries)
  const jobs = NAMES.map(name => binaries?.[name].job).filter((job): job is BinaryJob => job?.status === 'running')
  if (!jobs.length)
    return null
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {jobs.map((job) => {
        const percent = jobPercent(job)
        return (
          <Link
            key={job.id}
            to="/settings?tab=system"
            title="查看安装详情"
            className="flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/15"
          >
            <Loader2 size={13} className="animate-spin" />
            <span className="hidden sm:inline">{`正在${actionLabel(job.action)} `}</span>
            {BINARY_LABELS[job.binary]}
            {percent != null && <span className="tabular-nums">{`${Math.floor(percent)}%`}</span>}
          </Link>
        )
      })}
    </div>
  )
}
