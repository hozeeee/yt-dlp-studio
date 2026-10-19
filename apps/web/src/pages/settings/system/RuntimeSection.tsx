import type { LucideIcon } from 'lucide-react'
import type { ExtendedSystemInfo } from '../../../stores/app'
import { Container, FolderOpen, HardDrive, Server } from 'lucide-react'
import { ProgressBar } from '../../../components/ProgressBar'
import { Section } from '../../../components/Section'
import { formatBytes } from '../../../lib/format'
import { BinaryCard } from './BinaryCard'

export function RuntimeSection({ system }: { system: ExtendedSystemInfo }) {
  return (
    <Section title="运行环境" description="服务端信息，以及 yt-dlp 和 ffmpeg 的安装状态。安装在后台进行，切换页面不会中断。">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Info icon={Server} label="Studio" value={`v${system.version}`} />
          <Info icon={system.container ? Container : HardDrive} label="Node.js" value={`${system.node} · ${system.platform}/${system.arch}${system.container ? ' · 容器' : ''}`} />
          <Info icon={FolderOpen} label="下载目录" value={system.downloadDir} />
          <Info icon={FolderOpen} label="数据目录" value={system.dataDir} />
        </div>
        {system.disk && (
          <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-4 dark:bg-white/4">
            <div className="flex justify-between gap-3 text-xs text-slate-500">
              <span>下载磁盘可用空间</span>
              <span className="tabular-nums">{`${formatBytes(system.disk.free)} / ${formatBytes(system.disk.total)}`}</span>
            </div>
            <ProgressBar value={Math.max(2, (system.disk.total - system.disk.free) / system.disk.total * 100)} />
          </div>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          <BinaryCard name="ytdlp" status={system.binaries.ytdlp} />
          <BinaryCard name="ffmpeg" status={system.binaries.ffmpeg} />
        </div>
      </div>
    </Section>
  )
}

function Info({ icon: Icon, label, value }: { icon: LucideIcon, label: string, value: string }) {
  return (
    <div className="surface-muted min-w-0 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
        <Icon size={15} />
        {label}
      </div>
      <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200" title={value}>{value}</div>
    </div>
  )
}
