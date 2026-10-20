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
            {saving ? <Spinner className="size-3.5 text-white" /> : <Save />}
            {saving ? '保存中…' : dirty ? '保存更改' : '已保存'}
          </button>
        )}
      />
      <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200/90 dark:border-white/8">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={clsx('-mb-px flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[13px] font-medium transition', tab === id ? 'border-brand-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}>
            <Icon size={15} className={tab === id ? 'text-brand-600 dark:text-brand-400' : undefined} />
            {label}
          </button>
        ))}
      </div>
      {tab === 'general' && <GeneralSettings value={draft} onChange={setDraft} locked={settings.locked} />}
      {tab === 'network' && <NetworkSettings value={draft} onChange={setDraft} locked={settings.locked} />}
      {tab === 'system' && <SystemSettings value={draft} onChange={setDraft} system={system} locked={settings.locked} />}
      {dirty && (
        <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white/95 py-2 pr-2 pl-3.5 shadow-float backdrop-blur lg:bottom-4 dark:border-white/10 dark:bg-[#16181e]/95">
          <span className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
            <span className="size-1.5 rounded-full bg-amber-500" />
            有尚未保存的更改
          </span>
          <div className="flex gap-1.5">
            <button className="btn-ghost btn-sm" disabled={saving} onClick={() => setDraft(toEditable(settings))}>放弃</button>
            <button className="btn-primary btn-sm" disabled={saving} onClick={save}>
              <Save />
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
