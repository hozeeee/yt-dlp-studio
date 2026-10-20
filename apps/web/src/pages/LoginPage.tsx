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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f8fa] p-5 dark:bg-[#0b0c10]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(11_135_245/0.08),transparent_60%)]" />
      <div className="relative w-full max-w-[360px]">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <form className="surface p-6" onSubmit={submit}>
          <div className="mb-5">
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"><Lock size={16} /></div>
            <h1 className="text-lg leading-6 font-semibold text-slate-950 dark:text-white">访问受保护</h1>
            <p className="mt-1 text-[13px] text-slate-500">请输入服务器访问密码以继续</p>
          </div>
          <label>
            <span className="field-label">访问密码</span>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400" size={14} />
              <input className="input-base pl-8" type="password" value={password} onChange={event => setPassword(event.target.value)} autoFocus autoComplete="current-password" placeholder="输入密码" />
            </div>
          </label>
          {error && <div className="mt-3 rounded-md bg-red-50 px-2.5 py-1.5 text-[13px] text-red-600 dark:bg-red-500/8 dark:text-red-400">{error}</div>}
          <button className="btn-primary mt-4 w-full" disabled={!password || loading}>
            {loading ? <LoaderCircle className="animate-spin" /> : <Lock />}
            登录
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">yt-dlp Studio · Self-hosted media downloader</p>
      </div>
    </div>
  )
}
