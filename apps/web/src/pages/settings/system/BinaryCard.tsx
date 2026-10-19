import type { BinaryJob, BinaryName, BinaryStatus } from '@yt-dlp-studio/shared'
import clsx from 'clsx'
import { AlertCircle, CheckCircle2, ChevronRight, CircleSlash, Download, ExternalLink, RefreshCw, RotateCcw, X } from 'lucide-react'
import { BinaryJobProgress } from '../../../components/BinaryJobProgress'
import { actionLabel, BINARY_LABELS, cancelBinaryJob, startBinaryJob } from '../../../lib/binaries'
import { formatDate } from '../../../lib/format'

const META: Record<BinaryName, { description: string, homepage: string, required: boolean }> = {
  ytdlp: { description: '核心下载器，所有解析和下载都依赖它', homepage: 'https://github.com/yt-dlp/yt-dlp', required: true },
  ffmpeg: { description: '合并音视频、转换格式、嵌入字幕和封面', homepage: 'https://ffmpeg.org/', required: false },
}

/** Install state, actions and live progress of one managed binary */
export function BinaryCard({ name, status }: { name: BinaryName, status: BinaryStatus }) {
  const { info, installable, job } = status
  const meta = META[name]
  const label = BINARY_LABELS[name]
  const running = job?.status === 'running'
  const fromSystem = Boolean(info && !info.managed)
  // yt-dlp from PATH can update itself (`-U`); ffmpeg from the system is only replaced by a managed copy
  const action = !info ? 'install' : 'update'
  const canAct = installable || (name === 'ytdlp' && fromSystem)

  return (
    <div className="surface-muted flex min-w-0 flex-col gap-4 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl', info ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : meta.required ? 'bg-red-50 text-red-500 dark:bg-red-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10')}>
          {info ? <CheckCircle2 size={19} /> : <CircleSlash size={19} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white">{label}</span>
            <StatusBadge status={status} required={meta.required} />
            <a className="text-slate-400 hover:text-brand-600" href={meta.homepage} target="_blank" rel="noreferrer" aria-label={`${label} 项目主页`}><ExternalLink size={13} /></a>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta.description}</p>
          {info && (
            <div className="mt-2 flex min-w-0 flex-col gap-0.5 text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-200">{info.version}</span>
              <span className="truncate font-mono text-slate-400" title={info.path}>{info.path}</span>
            </div>
          )}
        </div>
      </div>

      {running && job && (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-200/70 bg-brand-50/60 p-3 dark:border-brand-500/20 dark:bg-brand-500/8">
          <BinaryJobProgress job={job} />
          <div className="flex justify-end">
            <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => cancelBinaryJob(name)}>
              <X size={14} />
              取消
            </button>
          </div>
        </div>
      )}
      {!running && job && <JobResult job={job} />}

      {!canAct && !info && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          当前平台没有可自动安装的预编译版本，请使用系统包管理器安装，或在下方填写可执行文件路径。
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {!running && canAct && (
          <button className={info ? 'btn-secondary py-2' : 'btn-primary py-2'} onClick={() => startBinaryJob(name, action)}>
            {info ? <RefreshCw size={15} /> : <Download size={15} />}
            {actionLabel(action)}
            {' '}
            {label}
          </button>
        )}
        {!running && name === 'ffmpeg' && fromSystem && installable && (
          <span className="text-xs text-slate-400">由系统提供；更新将安装一份托管版本并优先使用</span>
        )}
        {!running && name === 'ytdlp' && fromSystem && (
          <span className="text-xs text-slate-400">由系统提供，将执行 yt-dlp -U 自更新</span>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status, required }: { status: BinaryStatus, required: boolean }) {
  const { info, job } = status
  const [text, tone] = job?.status === 'running'
    ? [`${actionLabel(job.action)}中`, 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300']
    : info
      ? [info.managed ? '托管版本' : '系统提供', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300']
      : [required ? '未安装' : '未安装（可选）', required ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300']
  return <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-medium', tone)}>{text}</span>
}

/** Outcome of the last finished job, with its log for troubleshooting */
function JobResult({ job }: { job: BinaryJob }) {
  const action = actionLabel(job.action)
  const error = job.status === 'error'
  return (
    <div className={clsx('flex flex-col gap-2 rounded-xl border p-3 text-xs', error ? 'border-red-200 bg-red-50/70 text-red-700 dark:border-red-500/25 dark:bg-red-500/8 dark:text-red-300' : 'border-slate-200/70 bg-white/60 text-slate-500 dark:border-white/8 dark:bg-white/3 dark:text-slate-400')}>
      <div className="flex items-start gap-2">
        {error ? <AlertCircle size={15} className="mt-px shrink-0" /> : job.status === 'success' ? <CheckCircle2 size={15} className="mt-px shrink-0 text-emerald-500" /> : <RotateCcw size={15} className="mt-px shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            {job.status === 'success' ? `${action}成功` : error ? `${action}失败` : `${action}已取消`}
            {job.finishedAt && <span className="ml-2 font-normal opacity-70">{formatDate(job.finishedAt)}</span>}
          </div>
          {error && job.error && <div className="mt-1 leading-5 break-words">{job.error}</div>}
          {error && <div className="mt-1 opacity-80">可检查网络，或在下方「可执行文件」中设置 GitHub 下载镜像并保存后重试。</div>}
        </div>
      </div>
      {job.log.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 font-medium select-none hover:underline [&::-webkit-details-marker]:hidden">
            <ChevronRight size={13} className="transition group-open:rotate-90" />
            查看日志（
            {job.log.length}
            {' '}
            行）
          </summary>
          <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap text-slate-300">{job.log.join('\n')}</pre>
        </details>
      )}
    </div>
  )
}
