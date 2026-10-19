import type { AppSettings, CookieFile } from '@yt-dlp-studio/shared'
import clsx from 'clsx'
import { AlertTriangle, Cookie, FileText, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { HelpTip } from '../../../components/HelpTip'
import { Section } from '../../../components/Section'
import { Spinner } from '../../../components/Spinner'
import { Switch } from '../../../components/Switch'
import { api, json } from '../../../lib/api'
import { EXTENSIONS } from '../../../lib/cookieExtension'
import { formatBytes, formatDate } from '../../../lib/format'
import { useAppStore } from '../../../stores/app'
import { confirmDialog } from '../../../stores/dialog'
import { toast } from '../../../stores/toast'
import { ExtensionLinks } from './CookieExtension'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function CookieSection({ value, onChange }: { value: AppSettings, onChange: (value: AppSettings) => void }) {
  const files = useAppStore(state => state.cookies)
  const [uploading, setUploading] = useState(false)
  const enabled = files.filter(file => file.enabled).length

  async function upload(list: FileList | File[]) {
    const selected = [...list]
    if (!selected.length)
      return
    setUploading(true)
    const failed: string[] = []
    let done = 0
    for (const file of selected) {
      try {
        await api<CookieFile>('/cookies', json('POST', { name: file.name, content: await file.text() }))
        done++
      }
      catch (error) {
        failed.push(`${file.name}：${errorMessage(error)}`)
      }
    }
    try {
      useAppStore.setState({ cookies: await api<CookieFile[]>('/cookies') })
    }
    catch {}
    setUploading(false)
    if (done)
      toast.success(`已上传 ${done} 个 Cookie 文件`, '同名文件会被替换，所有启用的文件将自动合并使用')
    if (failed.length)
      toast.error(`${failed.length} 个文件上传失败`, failed.join('；'))
  }

  return (
    <Section
      title="Cookie 文件"
      extra={<CookieHelp />}
      description="上传 Netscape 格式的 cookies.txt，可按网站分别上传多个文件，启用的文件会自动合并后交给 yt-dlp。"
    >
      <div className="flex flex-col gap-4">
        {value.cookiesMode !== 'file' && files.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle size={17} className="shrink-0" />
            <span className="min-w-0 flex-1">当前「Cookie 来源」不是上传的文件，下面的文件不会被使用。</span>
            <button className="btn-secondary py-1.5 text-xs" onClick={() => onChange({ ...value, cookiesMode: 'file' })}>改为使用上传的文件</button>
          </div>
        )}

        <ExtensionLinks />
        <DropZone uploading={uploading} onFiles={upload} />

        {files.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1 text-xs text-slate-400">
              <span>{`${files.length} 个文件，已启用 ${enabled} 个`}</span>
            </div>
            <ul className="flex flex-col gap-2">
              {files.map(file => <CookieRow key={file.id} file={file} />)}
            </ul>
          </div>
        )}
      </div>
    </Section>
  )
}

function CookieHelp() {
  return (
    <HelpTip label="如何导出 Cookie" width="w-96">
      <div className="flex flex-col gap-3">
        <div className="font-semibold text-slate-900 dark:text-white">如何导出 cookies.txt</div>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>
            安装浏览器插件
            <strong className="mx-1 text-slate-800 dark:text-slate-100">Get cookies.txt LOCALLY</strong>
            （
            {EXTENSIONS.map((item, index) => (
              <span key={item.href}>
                {index > 0 && ' / '}
                <a className="text-brand-600 hover:underline dark:text-brand-400" href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
              </span>
            ))}
            ）。无法访问扩展商店时，点击「离线安装」使用内置安装包。
          </li>
          <li>在浏览器中打开目标网站并登录账号。</li>
          <li>在该网站页面点击插件图标，格式选择 Netscape，点击「Export」下载 cookies.txt。</li>
          <li>回到这里上传文件。需要多个网站时，分别导出并上传即可，系统会自动合并。</li>
        </ol>
        <ul className="flex list-disc flex-col gap-1 border-t border-slate-100 pt-3 pl-5 text-xs leading-5 text-slate-500 dark:border-white/8 dark:text-slate-400">
          <li>同名文件再次上传会替换旧文件；多个文件包含相同 Cookie 时，以最近上传的为准。</li>
          <li>YouTube 建议在无痕 / 隐私窗口中登录并导出，导出后直接关闭该窗口，避免 Cookie 被浏览器轮换失效。</li>
          <li>请勿安装名为「Get cookies.txt」（无 LOCALLY）的旧插件，它已因窃取数据被商店下架。</li>
          <li>Cookie 相当于登录凭证，请勿分享给他人。</li>
        </ul>
      </div>
    </HelpTip>
  )
}

function DropZone({ uploading, onFiles }: { uploading: boolean, onFiles: (files: FileList) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      className={clsx('flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition', over ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-500/8' : 'border-slate-200 dark:border-white/10')}
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        if (!uploading)
          onFiles(event.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        multiple
        accept=".txt,text/plain"
        onChange={(event) => {
          if (event.target.files)
            onFiles(event.target.files)
          event.target.value = ''
        }}
      />
      {uploading ? <Spinner className="size-6" /> : <Upload size={22} className="text-slate-400" />}
      <div className="text-sm text-slate-600 dark:text-slate-300">
        {uploading ? '正在上传…' : '拖放 cookies.txt 到这里，支持一次选择多个文件'}
      </div>
      <button className="btn-secondary mt-1 py-2" disabled={uploading} onClick={() => inputRef.current?.click()}>
        <FileText size={15} />
        选择文件
      </button>
    </div>
  )
}

function CookieRow({ file }: { file: CookieFile }) {
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>, failure: string) {
    setBusy(true)
    try {
      await action()
    }
    catch (error) {
      toast.error(failure, errorMessage(error))
    }
    finally {
      setBusy(false)
    }
  }

  async function remove() {
    const ok = await confirmDialog({ title: `删除「${file.name}」？`, description: '删除后其中的 Cookie 将不再用于下载。', confirmText: '删除', danger: true })
    if (ok)
      await run(() => api(`/cookies/${file.id}`, { method: 'DELETE' }), '删除失败')
  }

  const domains = file.domains.slice(0, 4).join('、') + (file.domains.length > 4 ? ` 等 ${file.domains.length} 个域名` : '')
  return (
    <li className={clsx('flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-3 transition sm:flex-nowrap dark:border-white/8 dark:bg-white/3', !file.enabled && 'opacity-60')}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"><Cookie size={17} /></div>
      <div className="min-w-0 flex-1 basis-48">
        <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100" title={file.name}>{file.name}</div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400" title={file.domains.join('\n')}>{domains || '无域名'}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-slate-400">
          <span>{`${file.count} 条 Cookie`}</span>
          {file.expired > 0 && <span className="text-amber-600 dark:text-amber-400">{`${file.expired} 条已过期`}</span>}
          <span>{formatBytes(file.size)}</span>
          <span>{formatDate(file.updatedAt)}</span>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Switch checked={file.enabled} disabled={busy} onChange={next => run(() => api(`/cookies/${file.id}`, json('PATCH', { enabled: next })), '更新失败')} label={file.enabled ? '启用' : '停用'} />
        <button className="icon-btn text-slate-400 hover:text-red-600" disabled={busy} aria-label="删除" onClick={remove}><Trash2 size={16} /></button>
      </div>
    </li>
  )
}
