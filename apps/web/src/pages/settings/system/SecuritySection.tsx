import type { ReactNode } from 'react'
import type { ExtendedSystemInfo } from '../../../stores/app'
import { KeyRound, LogOut } from 'lucide-react'
import { useState } from 'react'
import { Field } from '../../../components/Field'
import { Modal } from '../../../components/Modal'
import { Section } from '../../../components/Section'
import { api, json } from '../../../lib/api'
import { useAppStore } from '../../../stores/app'
import { toast } from '../../../stores/toast'

export function SecuritySection({ system }: { system: ExtendedSystemInfo }) {
  const logout = useAppStore(state => state.logout)
  const authEnabled = useAppStore(state => state.settings?.authEnabled ?? false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')

  function closePassword() {
    setPasswordOpen(false)
    setCurrentPassword('')
    setPassword('')
  }

  async function savePassword() {
    try {
      await api('/system/password', json('PUT', { current: currentPassword, password }))
      closePassword()
      toast.success(password ? '访问密码已更新' : '访问密码已关闭')
    }
    catch (error) {
      toast.error('密码更新失败', error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <Section title="访问安全" description="为 Web 界面设置访问密码，或退出当前浏览器的登录会话。">
      <div className="divide-y divide-slate-100 dark:divide-white/6">
        <SettingRow title="访问密码" description={system.authLocked ? '由环境变量管理，无法在此修改' : authEnabled ? '已启用，访问界面需要先登录' : '未启用，任何能访问服务的人都可以使用'}>
          <button className="btn-secondary" disabled={system.authLocked} onClick={() => setPasswordOpen(true)}>
            <KeyRound />
            {authEnabled ? '修改密码' : '设置密码'}
          </button>
        </SettingRow>
        <SettingRow title="当前会话" description="退出后需要重新输入密码">
          <button className="btn-secondary text-red-600 dark:text-red-400" onClick={() => logout()}>
            <LogOut />
            退出登录
          </button>
        </SettingRow>
      </div>

      <Modal
        open={passwordOpen}
        onClose={closePassword}
        title="设置访问密码"
        description="留空新密码可关闭访问保护"
        size="sm"
        footer={(
          <>
            <button className="btn-secondary" onClick={closePassword}>取消</button>
            <button type="submit" form="password-form" className="btn-primary">保存密码</button>
          </>
        )}
      >
        <form
          id="password-form"
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void savePassword()
          }}
        >
          {authEnabled && <Field label="当前密码"><input className="input-base" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></Field>}
          <Field label="新密码"><input className="input-base" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="留空以关闭密码保护" /></Field>
        </form>
      </Modal>
    </Section>
  )
}

function SettingRow({ title, description, children }: { title: string, description: string, children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{title}</div>
        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</div>
      </div>
      {children}
    </div>
  )
}
