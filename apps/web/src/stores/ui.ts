import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'system' | 'light' | 'dark'
export type Language = 'zh-CN' | 'en'

interface UiState {
  theme: Theme
  language: Language
  sidebarOpen: boolean
  setTheme: (theme: Theme) => void
  setLanguage: (language: Language) => void
  setSidebarOpen: (open: boolean) => void
}

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export const useUiStore = create<UiState>()(persist(set => ({
  theme: 'system',
  language: navigator.language.startsWith('zh') ? 'zh-CN' : 'en',
  sidebarOpen: false,
  setTheme(theme) {
    applyTheme(theme)
    set({ theme })
  },
  setLanguage: language => set({ language }),
  setSidebarOpen: sidebarOpen => set({ sidebarOpen }),
}), {
  name: 'ytdlp-studio-ui',
  partialize: state => ({ theme: state.theme, language: state.language }),
  onRehydrateStorage: () => state => applyTheme(state?.theme ?? 'system'),
}))

applyTheme(useUiStore.getState().theme)
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (useUiStore.getState().theme === 'system')
    applyTheme('system')
})
