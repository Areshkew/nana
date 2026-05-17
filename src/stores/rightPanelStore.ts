// Original: Muxy/Views/MainWindow.swift — AttachedVCSLayout + vcsPanelVisible
// Description: Right panel UI state — visibility, width, which panel is active (VCS or FileTree).
//              Persisted to localStorage. Mutually exclusive: opening one closes the other.
// Status: Completed

import { create } from 'zustand'

const STORAGE_KEY_WIDTH = 'nana.rightPanelWidth'
const STORAGE_KEY_PANEL = 'nana.rightPanelActive'

export type RightPanelKind = 'vcs' | 'fileTree' | null

const MIN_WIDTH = 200
const DEFAULT_WIDTH = 400
const MAX_WIDTH = 800

interface RightPanelState {
  visible: boolean
  activePanel: RightPanelKind
  width: number

  toggleVCS: () => void
  toggleFileTree: () => void
  close: () => void
  setWidth: (width: number) => void
  commitWidth: () => void
}

function loadWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WIDTH)
    const value = Number(raw)
    if (value > 0) return Math.min(Math.max(value, MIN_WIDTH), MAX_WIDTH)
  } catch { /* empty */ }
  return DEFAULT_WIDTH
}

function loadPanel(): RightPanelKind {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PANEL)
    if (raw === 'vcs' || raw === 'fileTree') return raw
  } catch { /* empty */ }
  return null
}

export const useRightPanelStore = create<RightPanelState>((set, get) => ({
  visible: loadPanel() !== null,
  activePanel: loadPanel(),
  width: loadWidth(),

  toggleVCS: () => {
    const { visible, activePanel } = get()
    if (visible && activePanel === 'vcs') {
      set({ visible: false, activePanel: null })
      try { localStorage.setItem(STORAGE_KEY_PANEL, '') } catch { /* empty */ }
    } else {
      set({ visible: true, activePanel: 'vcs' })
      try { localStorage.setItem(STORAGE_KEY_PANEL, 'vcs') } catch { /* empty */ }
    }
  },

  toggleFileTree: () => {
    const { visible, activePanel } = get()
    if (visible && activePanel === 'fileTree') {
      set({ visible: false, activePanel: null })
      try { localStorage.setItem(STORAGE_KEY_PANEL, '') } catch { /* empty */ }
    } else {
      set({ visible: true, activePanel: 'fileTree' })
      try { localStorage.setItem(STORAGE_KEY_PANEL, 'fileTree') } catch { /* empty */ }
    }
  },

  close: () => {
    set({ visible: false, activePanel: null })
    try { localStorage.setItem(STORAGE_KEY_PANEL, '') } catch { /* empty */ }
  },

  setWidth: (width: number) => {
    const clamped = Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH)
    set({ width: clamped })
  },

  commitWidth: () => {
    set((state) => {
      try {
        localStorage.setItem(STORAGE_KEY_WIDTH, String(state.width))
      } catch { /* empty */ }
      return state
    })
  },
}))
