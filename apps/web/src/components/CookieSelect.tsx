import type { CookieFile, PublicSettings } from '@yt-dlp-studio/shared'
import type { ReactNode } from 'react'
import { COOKIES_NONE } from '@yt-dlp-studio/shared'
import { Link } from 'react-router'
import { useAppStore } from '../stores/app'
import { Field } from './Field'

interface Props {
  value?: string
  onChange: (value: string) => void
  /** Link being downloaded, used to point out matching cookie files */
  url?: string
}

function hostOf(url?: string) {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '').toLowerCase() : ''
  }
  catch {
    return ''
  }
}

function matches(file: CookieFile, host: string) {
  return !!host && file.domains.some(domain => host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`))
}

function globalLabel(settings: PublicSettings, files: CookieFile[]) {
  if (settings.cookiesMode === 'file') {
    const enabled = files.filter(file => file.enabled).length
    return enabled ? `跟随全局设置（合并 ${enabled} 个已启用文件）` : '跟随全局设置（暂无已启用文件）'
  }
  if (settings.cookiesMode === 'browser')
    return `跟随全局设置（从 ${settings.cookiesBrowser || '浏览器'} 读取）`
  return '跟随全局设置（不使用）'
}

export function CookieSelect({ value = '', onChange, url }: Props) {
  const settings = useAppStore(state => state.settings)!
  const files = useAppStore(state => state.cookies)
  const host = hostOf(url)
  const selected = files.find(file => file.id === value)
  const missing = !!value && value !== COOKIES_NONE && !selected
  const suggested = !value ? files.find(file => matches(file, host)) : undefined

  let hint: ReactNode = files.length
    ? '登录后才能下载的内容需要对应网站的 Cookie'
    : (
        <>
          还没有上传 Cookie 文件，可在
          <Link className="mx-1 text-brand-600 hover:underline dark:text-brand-400" to="/settings?tab=system">系统 › Cookie 文件</Link>
          上传
        </>
      )
  if (missing) {
    hint = <span className="text-red-600 dark:text-red-400">所选文件已被删除，请重新选择</span>
  }
  else if (selected && host && !matches(selected, host)) {
    hint = <span className="text-amber-600 dark:text-amber-400">{`该文件不包含 ${host} 的 Cookie`}</span>
  }
  else if (suggested) {
    hint = (
      <>
        {`「${suggested.name}」包含 ${host} 的 Cookie，`}
        <button type="button" className="text-brand-600 hover:underline dark:text-brand-400" onClick={() => onChange(suggested.id)}>使用该文件</button>
      </>
    )
  }

  return (
    <Field label="Cookie" hint={hint}>
      <select className="input-base" value={value} onChange={event => onChange(event.target.value)}>
        <option value="">{globalLabel(settings, files)}</option>
        <option value={COOKIES_NONE}>不使用 Cookie</option>
        {missing && <option value={value}>已删除的文件</option>}
        {files.length > 0 && (
          <optgroup label="上传的 Cookie 文件">
            {files.map(file => (
              <option key={file.id} value={file.id}>
                {`${file.name}${file.domains.length ? ` · ${file.domains.slice(0, 2).join('、')}${file.domains.length > 2 ? ' 等' : ''}` : ''}${matches(file, host) ? '（匹配当前链接）' : ''}`}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </Field>
  )
}
