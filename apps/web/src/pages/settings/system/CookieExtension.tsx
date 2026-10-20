import type { ReactNode } from 'react'
import { Download, ExternalLink, PackageOpen, Puzzle } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../../components/Modal'
import { EXTENSION_REPO, EXTENSIONS, OFFLINE_LICENSE, OFFLINE_PACKAGES, OFFLINE_VERSION, offlineUrl } from '../../../lib/cookieExtension'
import { formatBytes } from '../../../lib/format'

export function ExtensionLinks() {
  const [offline, setOffline] = useState(false)
  return (
    <div className="surface-muted flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><Puzzle size={16} /></div>
        <div className="min-w-0 text-[13px]">
          <div className="font-medium text-slate-800 dark:text-slate-100">还没有 cookies.txt？</div>
          <div className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            安装开源插件 Get cookies.txt LOCALLY，在已登录的网站上一键导出。打不开扩展商店时可使用离线安装包。
            <a className="ml-1 text-brand-600 hover:underline dark:text-brand-400" href={EXTENSION_REPO} target="_blank" rel="noreferrer">源码</a>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {EXTENSIONS.map(item => (
          <a key={item.href} className="btn-secondary btn-sm" href={item.href} target="_blank" rel="noreferrer">
            <ExternalLink />
            {item.label}
          </a>
        ))}
        <button className="btn-secondary btn-sm" onClick={() => setOffline(true)}>
          <PackageOpen />
          离线安装
        </button>
      </div>
      <OfflineInstallModal open={offline} onClose={() => setOffline(false)} />
    </div>
  )
}

function OfflineInstallModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="离线安装 Get cookies.txt LOCALLY"
      description={`安装包已内置在 yt-dlp Studio 中（v${OFFLINE_VERSION}），无需访问扩展商店。`}
      footer={<button className="btn-secondary" onClick={onClose}>关闭</button>}
    >
      <div className="flex flex-col gap-3">
        <OfflineCard
          title="Chrome / Edge 等 Chromium 内核浏览器"
          {...OFFLINE_PACKAGES.chrome}
          note="浏览器启动时如提示「停用开发者模式扩展程序」，选择保留即可。"
        >
          <li>下载 .zip 并解压到一个固定的文件夹（安装后请勿删除或移动该文件夹）。</li>
          <li>
            在地址栏打开
            <Code>chrome://extensions</Code>
            （Edge 为
            <Code>edge://extensions</Code>
            ），开启「开发者模式」。
          </li>
          <li>点击「加载已解压的扩展程序」，选择解压后包含 manifest.json 的文件夹。</li>
        </OfflineCard>
        <OfflineCard title="Firefox" {...OFFLINE_PACKAGES.firefox}>
          <li>下载 .xpi 文件（已由 Mozilla 官方签名）。</li>
          <li>
            将文件拖入 Firefox 窗口；或打开
            <Code>about:addons</Code>
            ，点击齿轮图标 →「从文件安装附加组件」并选择该文件。
          </li>
          <li>在弹出的确认框中点击「添加」。</li>
        </OfflineCard>
        <p className="text-xs leading-5 text-slate-400">
          插件版权归原作者所有，按
          <a className="mx-1 text-brand-600 hover:underline dark:text-brand-400" href={OFFLINE_LICENSE} target="_blank" rel="noreferrer">MIT 协议</a>
          随本项目分发，内容与官方发布版本一致。
        </p>
      </div>
    </Modal>
  )
}

function OfflineCard({ title, file, size, note, children }: { title: string, file: string, size: number, note?: string, children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-lg border border-slate-200/80 p-3 dark:border-white/8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-slate-800 dark:text-slate-100">{title}</div>
          <div className="truncate text-xs text-slate-400" title={file}>{`${file} · ${formatBytes(size)}`}</div>
        </div>
        <a className="btn-primary btn-sm" href={offlineUrl(file)} download={file}>
          <Download />
          下载安装包
        </a>
      </div>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-[13px] leading-6 text-slate-600 dark:text-slate-300">
        {children}
      </ol>
      {note && <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{note}</p>}
    </section>
  )
}

function Code({ children }: { children: ReactNode }) {
  return <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-700 select-all dark:bg-white/8 dark:text-slate-200">{children}</code>
}
