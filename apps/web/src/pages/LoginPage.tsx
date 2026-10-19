import { KeyRound, LoaderCircle, Lock } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '../components/Logo'
import { useAppStore } from '../stores/app'

export function LoginPage() {
  const login = useAppStore(state => state.login)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(password)
    }
    catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f8fb] p-5 dark:bg-[#0b0d12]">
      <div className="absolute -top-40 -left-40 size-96 rounded-full bg-brand-400/10 blur-3xl" />
      <div className="absolute -right-40 -bottom-40 size-96 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-7 flex justify-center"><Logo /></div>
        <form className="surface p-6 sm:p-8" onSubmit={submit}>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><Lock size={21} /></div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">访问受保护</h1>
            <p className="mt-2 text-sm text-slate-500">请输入服务器访问密码以继续</p>
          </div>
          <label>
            <span className="field-label">访问密码</span>
            <div className="relative">
              <KeyRound className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} />
              <input className="input-base pl-9" type="password" value={password} onChange={event => setPassword(event.target.value)} autoFocus autoComplete="current-password" placeholder="输入密码" />
            </div>
          </label>
          {error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/8 dark:text-red-400">{error}</div>}
          <button className="btn-primary mt-5 w-full" disabled={!password || loading}>
            {loading ? <LoaderCircle className="animate-spin" size={17} /> : <Lock size={16} />}
            登录
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-400">yt-dlp Studio · Self-hosted media downloader</p>
      </div>
    </div>
  )
}
