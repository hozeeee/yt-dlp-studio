import type { AppSettings, PublicSettings } from '@yt-dlp-studio/shared'
import clsx from 'clsx'
import { Network, Save, Settings, SlidersHorizontal, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { api, json } from '../lib/api'
import { useAppStore } from '../stores/app'
import { toast } from '../stores/toast'
import { GeneralSettings } from './settings/GeneralSettings'
import { NetworkSettings } from './settings/NetworkSettings'
import { SystemSettings } from './settings/SystemSettings'

type Tab = 'general' | 'network' | 'system'
const TABS: Tab[] = ['general', 'network', 'system']

function toEditable(settings: PublicSettings): AppSettings {
  const { locked: _, authEnabled: __, ...editable } = settings
  return structuredClone(editable)
}

export function SettingsPage() {
  const settings = useAppStore(state => state.settings)!
  const system = useAppStore(state => state.system)!
  const [draft, setDraft] = useState<AppSettings>(() => toEditable(settings))
  const [params, setParams] = useSearchParams()
  const tab: Tab = TABS.find(item => item === params.get('tab')) ?? 'general'
  const setTab = (next: Tab) => setParams(next === 'general' ? {} : { tab: next }, { replace: true })
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(toEditable(settings))

  async function save() {
    setSaving(true)
    try {
      const updated = await api<PublicSettings>('/settings', json('PUT', draft))
      setDraft(toEditable(updated))
      toast.success('设置已保存', '新设置会立即应用到后续任务')
    }
    catch (error) {
      toast.error('保存失败', error instanceof Error ? error.message : String(error))
    }
    finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'general' as const, label: '常规与下载', icon: SlidersHorizontal },
    { id: 'network' as const, label: '网络与高级', icon: Network },
    { id: 'system' as const, label: '系统', icon: Wrench },
  ]

  return (
    <div className="page-enter flex flex-col">
      <PageHeader
        title="设置"
        description="管理下载默认值、网络选项、运行环境和访问安全。"
        icon={Settings}
        actions={(
          <button className="btn-primary" disabled={!dirty || saving} onClick={save}>
            {saving ? <Spinner className="size-4 text-white" /> : <Save size={16} />}
            {saving ? '保存中…' : dirty ? '保存更改' : '已保存'}
          </button>
        )}
      />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1.5 dark:border-white/8 dark:bg-[#12151c]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={clsx('flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition', tab === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/6')}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      {tab === 'general' && <GeneralSettings value={draft} onChange={setDraft} locked={settings.locked} />}
      {tab === 'network' && <NetworkSettings value={draft} onChange={setDraft} locked={settings.locked} />}
      {tab === 'system' && <SystemSettings value={draft} onChange={setDraft} system={system} locked={settings.locked} />}
      {dirty && (
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 mt-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/95 p-3 shadow-lg backdrop-blur dark:border-amber-500/20 dark:bg-amber-500/10 lg:bottom-4">
          <span className="px-2 text-sm text-amber-800 dark:text-amber-300">有尚未保存的更改</span>
          <button className="btn-primary py-2" disabled={saving} onClick={save}>
            <Save size={15} />
            保存
          </button>
        </div>
      )}
    </div>
  )
}
