import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { Download, FolderOpen, ListVideo, Menu, Moon, Settings, Sun, Tv, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAppStore } from '../stores/app'
import { useUiStore } from '../stores/ui'
import { BinaryJobIndicator } from './BinaryJobIndicator'
import { Logo } from './Logo'

interface NavItem { to: string, label: string, icon: LucideIcon }
const NAV: NavItem[] = [
  { to: '/', label: '新建下载', icon: Download },
  { to: '/tasks', label: '下载任务', icon: ListVideo },
  { to: '/library', label: '文件库', icon: FolderOpen },
  { to: '/subscriptions', label: '订阅', icon: Tv },
  { to: '/settings', label: '设置', icon: Settings },
]

const DESKTOP = '(min-width: 1024px)'

function useActiveCount() {
  return useAppStore(state => state.tasks.filter(task => ['queued', 'downloading', 'processing'].includes(task.status)).length)
}

/** Settings needs attention while yt-dlp is missing */
function useSetupNeeded() {
  return useAppStore(state => Boolean(state.system && !state.system.ytdlp))
}

export function AppShell() {
  const { sidebarOpen, setSidebarOpen, setTheme } = useUiStore()
  const active = useActiveCount()
  const dark = document.documentElement.classList.contains('dark')

  // The drawer is modal; make sure it never stays open (and locks scrolling) on desktop
  useEffect(() => {
    const query = matchMedia(DESKTOP)
    const onChange = () => query.matches && setSidebarOpen(false)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [setSidebarOpen])

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/95 px-3 py-4 dark:border-white/7 dark:bg-[#101219]/95 lg:flex">
        <div className="mb-7 px-2"><Logo /></div>
        <Sidebar />
      </aside>

      <Dialog.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="animate-overlay-in fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm lg:hidden" />
          <Dialog.Content className="animate-drawer-in fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200/80 bg-white px-3 py-4 shadow-float outline-none dark:border-white/7 dark:bg-[#101219] lg:hidden">
            <Dialog.Title className="sr-only">导航</Dialog.Title>
            <Dialog.Description className="sr-only">切换功能模块</Dialog.Description>
            <div className="mb-7 flex items-center justify-between px-2">
              <Logo />
              <Dialog.Close className="icon-btn" aria-label="关闭导航"><X size={18} /></Dialog.Close>
            </div>
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-slate-200/70 bg-[#f6f8fb]/85 px-4 backdrop-blur-xl dark:border-white/7 dark:bg-[#0b0d12]/85 sm:px-6 lg:px-8">
          <button className="icon-btn lg:hidden" aria-label="打开导航" onClick={() => setSidebarOpen(true)}><Menu size={19} /></button>
          <div className="lg:hidden"><Logo compact /></div>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <BinaryJobIndicator />
            {active > 0 && (
              <NavLink to="/tasks" className="hidden items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 sm:flex">
                <span className="size-1.5 animate-pulse rounded-full bg-brand-500" />
                {`${active} 个进行中`}
              </NavLink>
            )}
            <button className="icon-btn" aria-label="切换主题" onClick={() => setTheme(dark ? 'light' : 'dark')}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-10"><Outlet /></main>
      </div>

      <BottomNav />
    </div>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const connected = useAppStore(state => state.connected)
  const active = useActiveCount()
  const setupNeeded = useSetupNeeded()
  return (
    <>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate} className={({ isActive }) => clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/6 dark:hover:text-white')}>
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
            {to === '/tasks' && active > 0 && <span className="ml-auto rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{active}</span>}
            {to === '/settings' && setupNeeded && <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">待配置</span>}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-2">
        <div className="surface-muted p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className={clsx('size-2 rounded-full', connected ? 'bg-emerald-500 shadow-[0_0_0_3px_rgb(16_185_129/0.12)]' : 'bg-amber-500')} />
            {connected ? '实时连接正常' : '正在重新连接'}
          </div>
          <div className="mt-2 text-[11px] leading-4 text-slate-400">队列、进度和订阅动态实时同步</div>
        </div>
      </div>
    </>
  )
}

function BottomNav() {
  const setupNeeded = useSetupNeeded()
  return (
    <nav className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-30 grid grid-cols-5 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-float backdrop-blur-xl dark:border-white/10 dark:bg-[#171a22]/95 lg:hidden">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => clsx('relative flex min-w-0 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium', isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400')}>
          <Icon size={18} />
          <span className="max-w-full truncate">{label}</span>
          {to === '/settings' && setupNeeded && <span className="absolute top-1.5 right-[calc(50%-14px)] size-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#171a22]" />}
        </NavLink>
      ))}
    </nav>
  )
}
