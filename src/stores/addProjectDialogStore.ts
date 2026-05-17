// Original: N/A — project infrastructure
// Description: Zustand store for the 3-action add-project dialog.
// Status: ✅ Completed

import { create } from 'zustand'

export interface AddProjectDialogOptions {
  title: string
  message: string
  nestedRepos: string[]
  showInitAction: boolean
}

interface AddProjectDialogState {
  open: boolean
  options: AddProjectDialogOptions | null
  resolve: ((value: 'init' | 'proceed' | null) => void) | null

  ask: (options: AddProjectDialogOptions) => Promise<'init' | 'proceed' | null>
  close: (result: 'init' | 'proceed' | null) => void
}

export const useAddProjectDialogStore = create<AddProjectDialogState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,

  ask: (options): Promise<'init' | 'proceed' | null> => {
    return new Promise((resolve) => {
      set({ open: true, options, resolve })
    })
  },

  close: (result) => {
    const { resolve } = get()
    if (resolve) {
      resolve(result)
    }
    set({ open: false, options: null, resolve: null })
  },
}))

/**
 * Convenience async helper — use anywhere (even outside React) to show the
 * add-project dialog and await the user's choice.
 */
export function showAddProjectDialog(
  options: AddProjectDialogOptions,
): Promise<'init' | 'proceed' | null> {
  return useAddProjectDialogStore.getState().ask(options)
}
