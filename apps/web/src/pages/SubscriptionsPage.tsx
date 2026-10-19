import type { CreateSubscriptionRequest, DownloadOptions, Subscription } from '@yt-dlp-studio/shared'
import { CalendarClock, Check, Plus, RefreshCw, Trash2, Tv } from 'lucide-react'
import { useState } from 'react'
import { DownloadOptionsForm } from '../components/DownloadOptionsForm'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { Switch } from '../components/Switch'
import { YtdlpRequired } from '../components/YtdlpRequired'
import { api, json } from '../lib/api'
import { useYtdlpReady } from '../lib/binaries'
import { formatDate } from '../lib/format'
import { useAppStore } from '../stores/app'
import { confirmDialog } from '../stores/dialog'
import { toast } from '../stores/toast'

export function SubscriptionsPage() {
  const subscriptions = useAppStore(state => state.subscriptions)
  const settings = useAppStore(state => state.settings)!
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [interval, setInterval] = useState(settings.subscriptionInterval)
  const [downloadExisting, setDownloadExisting] = useState(false)
  const [options, setOptions] = useState<DownloadOptions>({ ...settings.defaultOptions })
  const [saving, setSaving] = useState(false)
  const ready = useYtdlpReady()

  async function create() {
    setSaving(true)
    try {
      await api<Subscription>('/subscriptions', json('POST', { url, interval, downloadExisting, options } satisfies CreateSubscriptionRequest))
      toast.success('订阅已创建', downloadExisting ? '已有条目将加入队列' : '将从下次出现的新条目开始下载')
      setOpen(false)
      setUrl('')
    }
    catch (error) {
      toast.error('创建订阅失败', error instanceof Error ? error.message : String(error))
    }
    finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="订阅"
        description="定期检查频道和播放列表，自动将新内容加入下载队列。"
        icon={Tv}
        actions={(
          <button className="btn-primary" disabled={!ready} onClick={() => setOpen(true)}>
            <Plus size={16} />
            添加订阅
          </button>
        )}
      />
      <YtdlpRequired feature="订阅" className="mb-5" />
      {subscriptions.length
        ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{subscriptions.map(item => <SubscriptionCard key={item.id} item={item} />)}</div>
        : (
            <div className="surface">
              <EmptyState
                icon={Tv}
                title="还没有订阅"
                description="添加频道或播放列表链接，服务器会定期检查并自动下载新内容。"
                action={(
                  <button className="btn-primary" disabled={!ready} onClick={() => setOpen(true)}>
                    <Plus size={16} />
                    添加第一个订阅
                  </button>
                )}
              />
            </div>
          )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="添加订阅"
        description="订阅频道或播放列表中的新内容"
        size="lg"
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>取消</button>
            <button type="submit" form="subscription-form" className="btn-primary" disabled={!url || saving || !ready}>
              {saving ? <Spinner className="size-4 text-white" /> : <Check size={16} />}
              创建订阅
            </button>
          </>
        )}
      >
        <form
          id="subscription-form"
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (url && !saving && ready)
              void create()
          }}
        >
          <label className="block">
            <span className="field-label">频道或播放列表链接</span>
            <input className="input-base" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://www.youtube.com/@channel/videos" autoFocus />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">检查间隔（分钟）</span>
              <input className="input-base" type="number" min="5" value={interval} onChange={event => setInterval(Math.max(5, Number(event.target.value)))} />
            </label>
            <div>
              <span className="field-label">首次添加</span>
              <div className="flex h-11 items-center"><Switch checked={downloadExisting} onChange={setDownloadExisting} label="立即下载已有条目" /></div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-5 dark:border-white/7">
            <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">下载选项</h3>
            <DownloadOptionsForm value={options} onChange={setOptions} compact url={url.trim()} />
          </div>
        </form>
      </Modal>
    </div>
  )
}

function SubscriptionCard({ item }: { item: Subscription }) {
  const [busy, setBusy] = useState(false)
  const ready = useYtdlpReady()

  async function update(enabled: boolean) {
    try {
      await api(`/subscriptions/${item.id}`, json('PATCH', { enabled }))
    }
    catch (error) {
      toast.error('更新失败', error instanceof Error ? error.message : String(error))
    }
  }

  async function check() {
    setBusy(true)
    try {
      await api(`/subscriptions/${item.id}/check`, { method: 'POST' })
      toast.success('检查完成')
    }
    catch (error) {
      toast.error('检查失败', error instanceof Error ? error.message : String(error))
    }
    finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!await confirmDialog({ title: `删除订阅「${item.title}」？`, description: '已添加的下载任务和文件不会被删除。', confirmText: '删除', danger: true }))
      return
    try {
      await api(`/subscriptions/${item.id}`, { method: 'DELETE' })
    }
    catch (error) {
      toast.error('删除失败', error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <article className="surface overflow-hidden">
      <div className="relative aspect-[2.2/1] bg-slate-100 dark:bg-white/5">
        {item.thumbnail ? <img src={item.thumbnail} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className="flex h-full items-center justify-center text-slate-300"><Tv size={35} /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
        <div className="absolute right-3 bottom-3 left-3"><h3 className="line-clamp-2 font-semibold text-white">{item.title}</h3></div>
      </div>
      <div className="p-4">
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <Stat value={item.seenCount} label="已发现" />
          <Stat value={item.queuedCount} label="已入队" />
          <Stat value={`${item.interval}m`} label="间隔" />
        </div>
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CalendarClock size={14} />
            <span>
              上次检查：
              {formatDate(item.lastCheckedAt)}
            </span>
          </div>
          {item.lastError && <div className="line-clamp-2 rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-500/8 dark:text-red-400">{item.lastError}</div>}
        </div>
        <div className="mt-4 flex items-center border-t border-slate-100 pt-3 dark:border-white/7">
          <Switch checked={item.enabled} onChange={update} label={item.enabled ? '已启用' : '已暂停'} />
          <div className="ml-auto flex gap-1">
            <button className="icon-btn" title={ready ? '立即检查' : '需要先安装 yt-dlp'} disabled={busy || item.checking || !ready} onClick={check}><RefreshCw className={(busy || item.checking) ? 'animate-spin' : ''} size={16} /></button>
            <button className="icon-btn text-red-500" title="删除" onClick={remove}><Trash2 size={16} /></button>
          </div>
        </div>
      </div>
    </article>
  )
}

function Stat({ value, label }: { value: string | number, label: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 dark:bg-white/4">
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</div>
      <div className="mt-0.5 text-[10px] text-slate-400">{label}</div>
    </div>
  )
}
