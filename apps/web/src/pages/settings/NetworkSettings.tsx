import type { AppSettings } from '@yt-dlp-studio/shared'
import { Link } from 'react-router'
import { Field } from '../../components/Field'
import { Section } from '../../components/Section'
import { Switch } from '../../components/Switch'

export function NetworkSettings({ value, onChange, locked }: { value: AppSettings, onChange: (value: AppSettings) => void, locked: string[] }) {
  const set = <K extends keyof AppSettings>(key: K, next: AppSettings[K]) => onChange({ ...value, [key]: next })
  return (
    <div className="space-y-6">
      <Section title="网络" description="这些选项会应用到媒体解析、下载和订阅检查。">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="代理服务器" hint="支持 HTTP、HTTPS 和 SOCKS，例如 socks5://127.0.0.1:1080"><input className="input-base" value={value.proxy} onChange={event => set('proxy', event.target.value)} placeholder="留空表示直连" /></Field>
          <Field label="下载限速" hint="例如 500K、2M；留空不限速"><input className="input-base" value={value.rateLimit} onChange={event => set('rateLimit', event.target.value)} placeholder="2M" /></Field>
          <Field label="重试次数"><input className="input-base" type="number" min="0" value={value.retries} onChange={event => set('retries', Number(event.target.value))} /></Field>
          <Field label="并发分片数" hint="部分站点支持；过高可能触发限流"><input className="input-base" type="number" min="1" max="32" value={value.concurrentFragments} onChange={event => set('concurrentFragments', Number(event.target.value))} /></Field>
          <Field label="User-Agent"><input className="input-base" value={value.userAgent} onChange={event => set('userAgent', event.target.value)} placeholder="使用 yt-dlp 默认值" /></Field>
        </div>
      </Section>
      <Section title="Cookie" description="用于需要登录、年龄验证或地区限制的内容。">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Cookie 来源"
            hint={value.cookiesMode === 'file' && (
              <>
                在
                <Link className="mx-1 text-brand-600 hover:underline dark:text-brand-400" to="/settings?tab=system">系统 › Cookie 文件</Link>
                中上传和管理
              </>
            )}
          >
            <select className="input-base" value={value.cookiesMode} onChange={event => set('cookiesMode', event.target.value as AppSettings['cookiesMode'])}>
              <option value="none">不使用</option>
              <option value="file">上传的 cookies.txt</option>
              <option value="browser">从浏览器读取</option>
            </select>
          </Field>
          {value.cookiesMode === 'browser' && <Field label="浏览器"><input className="input-base" value={value.cookiesBrowser} onChange={event => set('cookiesBrowser', event.target.value)} placeholder="chrome / firefox / edge" /></Field>}
        </div>
      </Section>
      <Section title="高级 yt-dlp" description="错误参数会影响所有下载，请谨慎修改。">
        <Field label="全局额外参数"><textarea className="input-base min-h-24 font-mono text-xs" value={value.globalArgs} onChange={event => set('globalArgs', event.target.value)} placeholder="--write-info-json --no-mtime" /></Field>
        <div className="mt-4"><Switch checked={value.allowCustomArgs} disabled={locked.includes('allowCustomArgs')} onChange={next => set('allowCustomArgs', next)} label="允许每个下载任务使用自定义参数（仅适用于可信用户）" /></div>
      </Section>
    </div>
  )
}
