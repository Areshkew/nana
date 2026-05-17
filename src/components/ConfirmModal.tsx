// Original: N/A — project infrastructure
// Description: Generic confirmation modal rendered at app root. Replaces native
// window.confirm to prevent xterm.js focus theft.
// Status: ✅ Completed

import { useConfirmDialogStore, type ConfirmResult } from '../stores/confirmDialogStore'
import { AlertTriangle } from 'lucide-react'
import { focusActiveTerminal } from '../services/terminalFocus'

export function ConfirmModal(): JSX.Element | null {
  const open = useConfirmDialogStore((s) => s.open)
  const options = useConfirmDialogStore((s) => s.options)
  const close = useConfirmDialogStore((s) => s.close)

  if (!open || !options) return null

  const handleResult = (result: ConfirmResult) => {
    close(result)
    focusActiveTerminal()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleResult(false)
      }}
    >
      <div className="w-[360px] rounded-xl border border-white/10 bg-[#1e1e1e] p-5 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div>
            {options.title && (
              <h3 className="text-sm font-semibold text-white">{options.title}</h3>
            )}
            <p className="mt-1 text-[11px] leading-snug text-white/50">{options.message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => handleResult(false)}
            className="rounded-md px-3 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white/70"
          >
            {options.cancelLabel ?? 'Cancel'}
          </button>
          {options.extraLabel && (
            <button
              type="button"
              onClick={() => handleResult('extra')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium text-white ${
                options.extraDestructive ? 'bg-red-600/80 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {options.extraLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleResult(true)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium text-white ${
              options.destructive
                ? 'bg-red-600/80 hover:bg-red-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {options.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
