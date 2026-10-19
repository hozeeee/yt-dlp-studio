import type { BinaryJob } from '@yt-dlp-studio/shared'
import clsx from 'clsx'
import { jobPercent, PHASE_LABELS } from '../lib/binaries'
import { formatBytes, formatSpeed } from '../lib/format'
import { ProgressBar } from './ProgressBar'

/** Live progress of a running install / update job */
export function BinaryJobProgress({ job, compact = false }: { job: BinaryJob, compact?: boolean }) {
  const percent = jobPercent(job)
  const downloading = job.phase === 'downloading'
  return (
    <div className={clsx('flex min-w-0 flex-col', compact ? 'gap-1.5' : 'gap-2')}>
      <div className="flex min-w-0 items-baseline gap-2 text-xs">
        <span className="shrink-0 font-medium text-brand-700 dark:text-brand-300">
          {PHASE_LABELS[job.phase]}
          {job.steps > 1 && downloading && ` (${job.step}/${job.steps})`}
        </span>
        {downloading && job.file && <span className="min-w-0 truncate font-mono text-slate-400" title={job.file}>{job.file}</span>}
        {percent != null && (
          <span className="ml-auto shrink-0 font-semibold text-slate-700 tabular-nums dark:text-slate-200">
            {percent.toFixed(percent >= 99.5 ? 0 : 1)}
            %
          </span>
        )}
      </div>
      <ProgressBar value={percent} />
      {downloading && !compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
          <span>
            {formatBytes(job.downloaded)}
            {job.total ? ` / ${formatBytes(job.total)}` : ''}
          </span>
          <span>{formatSpeed(job.speed)}</span>
        </div>
      )}
    </div>
  )
}
