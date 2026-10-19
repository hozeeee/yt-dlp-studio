import type { ExtendedSystemInfo } from '../../../stores/app'
import { KeyRound, LogOut } from 'lucide-react'
import { useState } from 'react'
import { Field } from '../../../components/Field'
import { Modal } from '../../../components/Modal'
import { Section } from '../../../components/Section'
import { api, json } from '../../../lib/api'
import { useAppStore } from '../../../stores/app'
import { toast } from '../../../stores/toast'
import { useUiStore } from '../../../stores/ui'

export function SecuritySection({ system }: { system: ExtendedSystemInfo }) {
  const logout = useAppStore(state => state.logout)
  const authEnabled = useAppStore(state => state.settings?.authEnabled ?? false)
  const { theme, setTheme } = useUiStore()
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
    <Section title="界面与安全">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="外观主题">
          <select className="input-base" value={theme} onChange={event => setTheme(event.target.value as 'system' | 'light' | 'dark')}>
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </Field>
        <div>
          <span className="field-label">访问保护</span>
          <button className="btn-secondary w-full" disabled={system.authLocked} onClick={() => setPasswordOpen(true)}>
            <KeyRound size={16} />
            {system.authLocked ? '由环境变量管理' : authEnabled ? '修改访问密码' : '设置访问密码'}
          </button>
        </div>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-5 dark:border-white/7">
        <button className="btn-secondary text-red-600" onClick={() => logout()}>
          <LogOut size={16} />
          退出当前会话
        </button>
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
