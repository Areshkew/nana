// Original: Muxy/Views/MainWindow.swift (CloseConfirmationKind + presentCloseConfirmation)
// Description: Tab close confirmation dialog — running process, unsaved editor, last tab.
// Status: Completed

import { useState } from 'react'
import { AlertTriangle, FileWarning, X } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'

export type CloseConfirmationKind = 'runningProcess' | 'unsavedEditor' | 'lastTab'

interface ConfirmDialogProps {
  kind: CloseConfirmationKind
  onConfirm: () => void
  onCancel: () => void
  onSave?: () => void
}

const CONFIG: Record<CloseConfirmationKind, {
  title: string
  message: string
  icon: typeof AlertTriangle
  confirmLabel: string
  showSave: boolean
  showDontAskAgain: boolean
}> = {
  runningProcess: {
    title: 'Close Tab?',
    message: 'A process is still running in this tab. Are you sure you want to close it?',
    icon: AlertTriangle,
    confirmLabel: 'Close',
    showSave: false,
    showDontAskAgain: true,
  },
  unsavedEditor: {
    title: 'Save Changes Before Closing?',
    message: 'This file has unsaved changes. If you don\'t save, your changes will be lost.',
    icon: FileWarning,
    confirmLabel: "Don't Save",
    showSave: true,
    showDontAskAgain: false,
  },
  lastTab: {
    title: 'Close Project?',
    message: 'This is the last tab. Closing it will remove the project from the sidebar.',
    icon: X,
    confirmLabel: 'Close',
    showSave: false,
    showDontAskAgain: false,
  },
}

export function ConfirmDialog({ kind, onConfirm, onCancel, onSave }: ConfirmDialogProps): JSX.Element {
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const cfg = CONFIG[kind]
  const Icon = cfg.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-[380px] rounded-xl border border-white/10 bg-[#1e1e1e] p-5 shadow-2xl">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
            <Icon size={16} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{cfg.title}</h3>
            <p className="mt-1 text-[11px] leading-snug text-white/50">{cfg.message}</p>
          </div>
        </div>

        {cfg.showDontAskAgain && (
          <label className="mb-3 ml-11 flex items-center gap-1.5 text-[11px] text-white/40">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="rounded border-white/20 bg-white/5"
            />
            Don&apos;t ask again
          </label>
        )}

        <div className="flex justify-end gap-2">
          {cfg.showSave && onSave && (
            <button
              type="button"
              onClick={() => {
                if (dontAskAgain) useSettingsStore.getState().setConfirmCloseRunningProcess(false)
                onSave()
              }}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              Save
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white/70"
          >
            Cancel
          </button>
          <button
            type="button"
              onClick={() => {
                if (dontAskAgain && kind === 'runningProcess') {
                  useSettingsStore.getState().setConfirmCloseRunningProcess(false)
                }
                onConfirm()
              }}
            className="rounded-md bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
          >
            {cfg.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
