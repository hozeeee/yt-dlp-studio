import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { Download, FolderOpen, ListVideo, Menu, ScrollText, Settings, Tv, X } from 'lucide-react'
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
  { to: '/logs', label: '日志', icon: ScrollText },
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
  const { sidebarOpen, setSidebarOpen } = useUiStore()
  const active = useActiveCount()

  // The drawer is modal; make sure it never stays open (and locks scrolling) on desktop
  useEffect(() => {
    const query = matchMedia(DESKTOP)
    const onChange = () => query.matches && setSidebarOpen(false)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [setSidebarOpen])

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-slate-200/80 bg-white px-2.5 py-3 dark:border-white/7 dark:bg-[#0f1115] lg:flex">
        <div className="mb-4 px-1.5"><Logo /></div>
        <Sidebar />
      </aside>

      <Dialog.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="animate-overlay-in fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm lg:hidden" />
          <Dialog.Content className="animate-drawer-in fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-slate-200/80 bg-white px-2.5 py-3 shadow-float outline-none dark:border-white/7 dark:bg-[#0f1115] lg:hidden">
            <Dialog.Title className="sr-only">导航</Dialog.Title>
            <Dialog.Description className="sr-only">切换功能模块</Dialog.Description>
            <div className="mb-4 flex items-center justify-between px-1.5">
              <Logo />
              <Dialog.Close className="icon-btn" aria-label="关闭导航"><X /></Dialog.Close>
            </div>
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop has the sidebar for branding and status, so the top bar only exists on small screens */}
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-slate-200/70 bg-white/85 px-3 backdrop-blur-xl dark:border-white/7 dark:bg-[#0b0c10]/85 sm:px-4 lg:hidden">
          <button className="icon-btn" aria-label="打开导航" onClick={() => setSidebarOpen(true)}><Menu /></button>
          <Logo compact />
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <BinaryJobIndicator />
            {active > 0 && (
              <NavLink to="/tasks" className="hidden items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 sm:flex">
                <span className="size-1.5 animate-pulse rounded-full bg-brand-500" />
                {`${active} 个进行中`}
              </NavLink>
            )}
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-3 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-5 lg:px-6 lg:pt-5 lg:pb-8"><Outlet /></main>
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
      <nav className="flex flex-col gap-px">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate} className={({ isActive }) => clsx('flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition', isActive ? 'bg-slate-100 text-slate-900 dark:bg-white/8 dark:text-white' : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white')}>
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-brand-600 dark:text-brand-400' : undefined} />
                <span>{label}</span>
                {to === '/tasks' && active > 0 && <span className="ml-auto rounded-full bg-brand-600 px-1.5 text-[10px] leading-4 font-semibold text-white tabular-nums">{active}</span>}
                {to === '/settings' && setupNeeded && <span className="ml-auto rounded-full bg-red-500 px-1.5 text-[10px] leading-4 font-semibold text-white">待配置</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2 px-1 pt-2">
        <BinaryJobIndicator className="flex-col items-stretch" />
        <div className="flex items-center gap-2 border-t border-slate-100 px-1.5 pt-2.5 text-xs text-slate-500 dark:border-white/6 dark:text-slate-400" title="队列、进度、订阅和日志实时同步">
          <span className={clsx('size-1.5 rounded-full', connected ? 'bg-emerald-500 shadow-[0_0_0_3px_rgb(16_185_129/0.15)]' : 'animate-pulse bg-amber-500')} />
          {connected ? '实时连接正常' : '正在重新连接…'}
        </div>
      </div>
    </>
  )
}

function BottomNav() {
  const setupNeeded = useSetupNeeded()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-slate-200/80 bg-white/95 px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl dark:border-white/8 dark:bg-[#121419]/95 lg:hidden">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => clsx('relative flex min-w-0 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400')}>
          <Icon size={18} />
          <span className="max-w-full truncate">{label}</span>
          {to === '/settings' && setupNeeded && <span className="absolute top-1 right-[calc(50%-14px)] size-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#121419]" />}
        </NavLink>
      ))}
    </nav>
  )
}
