import type { AppSettings } from '@yt-dlp-studio/shared'
import type { ExtendedSystemInfo } from '../../stores/app'
import { CookieSection } from './system/CookieSection'
import { ExecutablesSection } from './system/ExecutablesSection'
import { RuntimeSection } from './system/RuntimeSection'
import { SecuritySection } from './system/SecuritySection'

export function SystemSettings({ value, onChange, system, locked }: { value: AppSettings, onChange: (value: AppSettings) => void, system: ExtendedSystemInfo, locked: string[] }) {
  return (
    <div className="flex flex-col gap-6">
      <RuntimeSection system={system} />
      <ExecutablesSection value={value} onChange={onChange} locked={locked} />
      <CookieSection value={value} onChange={onChange} />
      <SecuritySection system={system} />
    </div>
  )
}
