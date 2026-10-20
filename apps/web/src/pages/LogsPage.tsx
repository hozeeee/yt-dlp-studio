import type { LogFilter } from './logs/useLogFeed'
import { FileDown, RefreshCw, ScrollText, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { api } from '../lib/api'
import { logExportUrl } from '../lib/logs'
import { confirmDialog } from '../stores/dialog'
import { toast } from '../stores/toast'
import { LogRow } from './logs/LogRow'
import { LogToolbar } from './logs/LogToolbar'
import { useLogFeed } from './logs/useLogFeed'

export function LogsPage() {
  const [filter, setFilter] = useState<LogFilter>({ level: 'info', category: '', search: '' })
  const feed = useLogFeed(filter)
  const filtered = !!filter.category || !!filter.search.trim()

  async function clear() {
    if (!await confirmDialog({ title: '清空全部日志？', description: '内存与磁盘中保存的日志都会被删除，此操作无法撤销。', confirmText: '清空', danger: true }))
      return
    try {
      await api('/logs', { method: 'DELETE' })
      toast.success('日志已清空')
    }
    catch (error) {
      toast.error('清空失败', error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="日志"
        description="查看预览解析、下载、订阅和系统运行等操作记录，实时更新。"
        icon={ScrollText}
        actions={(
          <>
            <button className="btn-secondary w-8 px-0" title="刷新" aria-label="刷新" onClick={() => void feed.reload()} disabled={feed.loading}><RefreshCw className={feed.loading ? 'animate-spin' : undefined} /></button>
            <a className="btn-secondary" href={logExportUrl(feed.query)} download title="按当前筛选条件导出为文本文件">
              <FileDown />
              导出
            </a>
            <button className="btn-secondary" onClick={clear}>
              <Trash2 />
              清空
            </button>
          </>
        )}
      />
      <div className="surface overflow-hidden">
        <LogToolbar filter={filter} onChange={setFilter} paused={feed.paused} onPausedChange={feed.setPaused} pending={feed.pending} />
        {feed.loading && !feed.entries.length
          ? <div className="flex min-h-56 items-center justify-center"><Spinner /></div>
          : feed.entries.length
            ? (
                <>
                  <ul className="divide-y divide-slate-100 dark:divide-white/5">
                    {feed.entries.map(entry => <LogRow key={entry.id} entry={entry} />)}
                  </ul>
                  <div className="flex h-10 items-center justify-center border-t border-slate-100 px-4 text-xs text-slate-400 dark:border-white/5">
                    {feed.hasMore
                      ? (
                          <button className="btn-ghost btn-sm" onClick={() => void feed.loadMore()} disabled={feed.loadingMore}>
                            {feed.loadingMore && <Spinner className="size-3.5" />}
                            加载更早的日志
                          </button>
                        )
                      : `共 ${feed.entries.length} 条，已经到底了`}
                  </div>
                </>
              )
            : <EmptyState icon={ScrollText} title={filtered ? '没有匹配的日志' : '暂无日志'} description={filtered ? '当前筛选条件下没有日志，换个分类或关键词试试。' : `解析链接、下载或修改设置后，相关记录会出现在这里${filter.level === 'debug' ? '' : '；调试日志需将级别切换为“全部级别”查看'}。`} />}
      </div>
    </div>
  )
}
