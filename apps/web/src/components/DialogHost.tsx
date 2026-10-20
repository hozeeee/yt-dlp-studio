import type { ConfirmOptions, PromptOptions } from '../stores/dialog'
import { AlertTriangle } from 'lucide-react'
import { AlertDialog } from 'radix-ui'
import { useState } from 'react'
import { useDialogStore } from '../stores/dialog'
import { Modal } from './Modal'

/** Renders the confirm / prompt dialogs requested through `confirmDialog` / `promptDialog` */
export function DialogHost() {
  const current = useDialogStore(state => state.current)
  if (!current)
    return null
  const finish = (value: boolean | string | null) => {
    useDialogStore.setState({ current: null })
    if (current.kind === 'confirm')
      current.resolve(value === true)
    else
      current.resolve(typeof value === 'string' ? value : null)
  }
  return current.kind === 'confirm'
    ? <ConfirmView options={current.options} onFinish={finish} />
    : <PromptView key={current.options.title} options={current.options} onFinish={finish} />
}

function ConfirmView({ options, onFinish }: { options: ConfirmOptions, onFinish: (value: boolean) => void }) {
  return (
    <AlertDialog.Root open onOpenChange={open => !open && onFinish(false)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="animate-overlay-in fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px]" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-5">
          <AlertDialog.Content className="animate-dialog-in pointer-events-auto flex w-full flex-col gap-4 rounded-t-2xl border border-slate-200/70 bg-white p-5 shadow-float outline-none dark:border-white/10 dark:bg-[#15171d] sm:max-w-md sm:rounded-xl">
            <div className="flex gap-3">
              {options.danger && <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10"><AlertTriangle size={16} /></div>}
              <div className="min-w-0 flex-1">
                <AlertDialog.Title className="text-[15px] leading-6 font-semibold text-slate-950 dark:text-white">{options.title}</AlertDialog.Title>
                <AlertDialog.Description className={options.description ? 'mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400' : 'sr-only'}>{options.description ?? options.title}</AlertDialog.Description>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel className="btn-secondary">{options.cancelText ?? '取消'}</AlertDialog.Cancel>
              <AlertDialog.Action className={options.danger ? 'btn-danger' : 'btn-primary'} onClick={() => onFinish(true)}>{options.confirmText ?? '确定'}</AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

function PromptView({ options, onFinish }: { options: PromptOptions, onFinish: (value: string | null) => void }) {
  const [value, setValue] = useState(options.defaultValue ?? '')
  const formId = 'prompt-dialog-form'
  return (
    <Modal
      open
      size="sm"
      title={options.title}
      description={options.description}
      onClose={() => onFinish(null)}
      footer={(
        <>
          <button type="button" className="btn-secondary" onClick={() => onFinish(null)}>{options.cancelText ?? '取消'}</button>
          <button type="submit" form={formId} className="btn-primary" disabled={!value.trim()}>{options.confirmText ?? '确定'}</button>
        </>
      )}
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          if (value.trim())
            onFinish(value.trim())
        }}
      >
        <label className="block">
          {options.label && <span className="field-label">{options.label}</span>}
          <input className="input-base" value={value} onChange={event => setValue(event.target.value)} placeholder={options.placeholder} autoFocus />
        </label>
      </form>
    </Modal>
  )
}
