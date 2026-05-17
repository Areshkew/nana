// Original: N/A — project infrastructure
// Description: Zustand store for managing a single global confirm modal.
// Replaces window.confirm / window.alert to avoid stealing xterm.js focus.
// Status: ✅ Completed

import { create } from 'zustand'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  extraLabel?: string
  extraDestructive?: boolean
}

export type ConfirmResult = boolean | 'extra'

interface ConfirmDialogState {
  open: boolean
  options: ConfirmOptions | null
  resolve: ((value: ConfirmResult) => void) | null

  ask: (options: ConfirmOptions) => Promise<ConfirmResult>
  close: (result: ConfirmResult) => void
}

export const useConfirmDialogStore = create<ConfirmDialogState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,

  ask: (options: ConfirmOptions): Promise<ConfirmResult> => {
    return new Promise((resolve) => {
      set({ open: true, options, resolve })
    })
  },

  close: (result: ConfirmResult) => {
    const { resolve } = get()
    if (resolve) {
      resolve(result)
    }
    set({ open: false, options: null, resolve: null })
  },
}))

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmDialogStore.getState().ask(options).then(r => r === true)
}
