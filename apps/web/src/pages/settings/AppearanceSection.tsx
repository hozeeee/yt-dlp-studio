import type { LucideIcon } from 'lucide-react'
import type { Theme } from '../../stores/ui'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Section } from '../../components/Section'
import { useUiStore } from '../../stores/ui'

const THEMES: { id: Theme, label: string, icon: LucideIcon }[] = [
  { id: 'system', label: '跟随系统', icon: Monitor },
  { id: 'light', label: '浅色', icon: Sun },
  { id: 'dark', label: '深色', icon: Moon },
]

/** Theme is a per-browser preference, applied immediately and not part of the saved server settings */
export function AppearanceSection() {
  const { theme, setTheme } = useUiStore()
  return (
    <Section title="外观" description="界面主题仅保存在当前浏览器，切换后立即生效。">
      <div role="radiogroup" aria-label="界面主题" className="segmented">
        {THEMES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="radio"
            aria-checked={theme === id}
            data-active={theme === id}
            onClick={() => setTheme(id)}
            className="segmented-item"
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>
    </Section>
  )
}
