// Original: Muxy/Views/Sidebar.swift (SidebarLayout + expanded state)
// Description: Sidebar UI state — expanded/collapsed, width, persisted to localStorage.
// Status: Completed

import { create } from 'zustand'

const STORAGE_KEY_EXPANDED = 'nana.sidebarExpanded'
const STORAGE_KEY_WIDTH = 'nana.sidebarExpandedWidth'

const DEFAULT_WIDTH = 220
const MIN_WIDTH = 160
const MAX_WIDTH = 480

interface SidebarState {
  isExpanded: boolean
  width: number

  toggle: () => void
  setExpanded: (expanded: boolean) => void
  setWidth: (width: number) => void
  commitWidth: () => void
}

function loadExpanded(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXPANDED)
    return raw === 'true'
  } catch {
    return false
  }
}

function loadWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WIDTH)
    const value = Number(raw)
    if (value > 0) return Math.min(Math.max(value, MIN_WIDTH), MAX_WIDTH)
  } catch { /* empty */ }
  return DEFAULT_WIDTH
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isExpanded: loadExpanded(),
  width: loadWidth(),

  toggle: () => {
    set((state) => {
      const next = !state.isExpanded
      try {
        localStorage.setItem(STORAGE_KEY_EXPANDED, String(next))
      } catch { /* empty */ }
      return { isExpanded: next }
    })
  },

  setExpanded: (expanded: boolean) => {
    set({ isExpanded: expanded })
    try {
      localStorage.setItem(STORAGE_KEY_EXPANDED, String(expanded))
    } catch { /* empty */ }
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
