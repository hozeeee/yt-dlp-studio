import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { DialogHost } from './components/DialogHost'
import { FullScreenLoading } from './components/Spinner'
import { ToastViewport } from './components/ToastViewport'
import { DownloadPage } from './pages/DownloadPage'
import { LibraryPage } from './pages/LibraryPage'
import { LoginPage } from './pages/LoginPage'
import { LogsPage } from './pages/LogsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SubscriptionsPage } from './pages/SubscriptionsPage'
import { TasksPage } from './pages/TasksPage'
import { useAppStore } from './stores/app'
import { toast } from './stores/toast'

export function App() {
  const { initialize, initialized, loading, auth, settings, system } = useAppStore()
  useEffect(() => {
    void initialize().catch(error => toast.error('无法连接服务器', error instanceof Error ? error.message : String(error)))
  }, [initialize])

  if (!initialized || loading) {
    return (
      <>
        <FullScreenLoading />
        <ToastViewport />
      </>
    )
  }
  if (!auth?.authenticated) {
    return (
      <>
        <LoginPage />
        <ToastViewport />
      </>
    )
  }
  if (!settings || !system)
    return <div className="flex min-h-screen items-center justify-center p-6 text-center text-slate-500">服务器数据加载失败，请刷新页面重试。</div>

  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DownloadPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <DialogHost />
      <ToastViewport />
    </>
  )
}
