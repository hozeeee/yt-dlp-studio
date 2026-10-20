import type { AppSettings } from '@yt-dlp-studio/shared'
import { DownloadOptionsForm } from '../../components/DownloadOptionsForm'
import { Field } from '../../components/Field'
import { OutputTemplateField } from '../../components/OutputTemplateField'
import { Section } from '../../components/Section'
import { Switch } from '../../components/Switch'
import { AppearanceSection } from './AppearanceSection'

export function GeneralSettings({ value, onChange, locked }: { value: AppSettings, onChange: (value: AppSettings) => void, locked: string[] }) {
  const set = <K extends keyof AppSettings>(key: K, next: AppSettings[K]) => onChange({ ...value, [key]: next })
  return (
    <div className="space-y-6">
      <Section title="存储与队列" description="配置文件保存位置、命名规则和并发行为。">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="下载目录" hint={locked.includes('downloadDir') ? '由环境变量锁定' : '服务器上的绝对或相对路径'}><input className="input-base" disabled={locked.includes('downloadDir')} value={value.downloadDir} onChange={event => set('downloadDir', event.target.value)} /></Field>
          <Field label="最大并发下载"><input className="input-base" type="number" min="1" max="20" value={value.maxConcurrent} disabled={locked.includes('maxConcurrent')} onChange={event => set('maxConcurrent', Number(event.target.value))} /></Field>
          <OutputTemplateField label="普通输出模板" scope="single" value={value.outputTemplate} onChange={next => set('outputTemplate', next)} emptyHint={<span className="text-amber-600 dark:text-amber-400">请填写模板，或点击「常用」选择常用格式</span>} />
          <OutputTemplateField label="播放列表输出模板" scope="playlist" value={value.outputTemplatePlaylist} onChange={next => set('outputTemplatePlaylist', next)} emptyHint="留空时使用普通输出模板" />
          <Field label="完成记录自动清理" hint="小时，0 表示永不"><input className="input-base" type="number" min="0" value={value.autoClearHours} onChange={event => set('autoClearHours', Number(event.target.value))} /></Field>
          <Field label="删除任务时的默认行为">
            <select className="input-base" value={value.deleteFiles} onChange={event => set('deleteFiles', event.target.value as AppSettings['deleteFiles'])}>
              <option value="ask">每次询问</option>
              <option value="never">保留文件</option>
              <option value="always">同时删除文件</option>
            </select>
          </Field>
        </div>
        <div className="mt-5"><Switch checked={value.useArchive} onChange={next => set('useArchive', next)} label="使用下载归档，避免重复下载相同媒体" /></div>
      </Section>
      <Section title="默认下载选项" description="新建下载和新订阅将使用这些初始值。"><DownloadOptionsForm value={value.defaultOptions} onChange={next => set('defaultOptions', next)} allowCustomArgs={value.allowCustomArgs} /></Section>
      <AppearanceSection />
    </div>
  )
}
