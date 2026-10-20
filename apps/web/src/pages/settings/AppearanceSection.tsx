import type { LucideIcon } from 'lucide-react'
import type { Theme } from '../../stores/ui'
import clsx from 'clsx'
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
      <div role="radiogroup" aria-label="界面主题" className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-slate-50 p-1 dark:border-white/8 dark:bg-white/4">
        {THEMES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="radio"
            aria-checked={theme === id}
            onClick={() => setTheme(id)}
            className={clsx('flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition', theme === id ? 'bg-white text-brand-700 shadow-sm dark:bg-white/10 dark:text-brand-300' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
    </Section>
  )
}
