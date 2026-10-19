import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react'
import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  title: string
  message?: string
}

interface ToastState {
  items: ToastItem[]
  push: (kind: ToastKind, title: string, message?: string) => void
  remove: (id: number) => void
}

let toastId = 0
export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push(kind, title, message) {
    const id = ++toastId
    set(state => ({ items: [...state.items, { id, kind, title, message }].slice(-5) }))
    window.setTimeout(() => get().remove(id), kind === 'error' ? 7000 : 4000)
  },
  remove: id => set(state => ({ items: state.items.filter(item => item.id !== id) })),
}))

export const toast = {
  success: (title: string, message?: string) => useToastStore.getState().push('success', title, message),
  error: (title: string, message?: string) => useToastStore.getState().push('error', title, message),
  warning: (title: string, message?: string) => useToastStore.getState().push('warning', title, message),
  info: (title: string, message?: string) => useToastStore.getState().push('info', title, message),
}

export const TOAST_ICONS: Record<ToastKind, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: TriangleAlert,
  info: Info,
}
