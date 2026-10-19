import { create } from 'zustand'

interface DialogBase {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  /** Destructive styling for the confirm button */
  danger?: boolean
}

export interface ConfirmOptions extends DialogBase {}

export interface PromptOptions extends DialogBase {
  label?: string
  placeholder?: string
  defaultValue?: string
}

type DialogRequest
  = | { kind: 'confirm', options: ConfirmOptions, resolve: (value: boolean) => void }
    | { kind: 'prompt', options: PromptOptions, resolve: (value: string | null) => void }

interface DialogState {
  current: DialogRequest | null
}

export const useDialogStore = create<DialogState>(() => ({
  current: null,
}))

function open(request: DialogRequest) {
  // Only one dialog at a time: dismiss a pending one as cancelled
  const pending = useDialogStore.getState().current
  if (pending)
    pending.kind === 'confirm' ? pending.resolve(false) : pending.resolve(null)
  useDialogStore.setState({ current: request })
}

/** Promise based replacement for `window.confirm` */
export function confirmDialog(options: ConfirmOptions) {
  return new Promise<boolean>(resolve => open({ kind: 'confirm', options, resolve }))
}

/** Promise based replacement for `window.prompt`, resolves `null` when cancelled */
export function promptDialog(options: PromptOptions) {
  return new Promise<string | null>(resolve => open({ kind: 'prompt', options, resolve }))
}
