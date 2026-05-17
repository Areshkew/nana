// Original: Muxy/Models/TerminalPaneState.swift
// Description: Minimal Zustand store for a single terminal pane.
// Status: ✅ Completed

import { create } from 'zustand'

interface TerminalStore {
  paneId: string
  title: string
  setTitle: (title: string) => void
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export const useTerminalStore = create<TerminalStore>((set) => ({
  paneId: crypto.randomUUID(),
  title: 'Terminal',
  setTitle: (title: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      set({ title })
    }, 500)
  },
}))
