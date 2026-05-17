// Original: Muxy/Models/TerminalSearchState.swift
// Description: Per-pane terminal search state with debounced needle publishing.
// Status: Completed

import { create } from 'zustand'

export interface PaneSearchState {
  needle: string
  total: number | null
  selected: number | null
  isVisible: boolean
}

interface TerminalSearchStore {
  searchStates: Record<string, PaneSearchState>
  setSearchVisible: (paneId: string, visible: boolean) => void
  setSearchNeedle: (paneId: string, needle: string) => void
  setSearchResult: (paneId: string, total: number | null, selected: number | null) => void
  getSearchState: (paneId: string) => PaneSearchState
  removePane: (paneId: string) => void
}

function defaultState(): PaneSearchState {
  return { needle: '', total: null, selected: null, isVisible: false }
}

export const useTerminalSearchStore = create<TerminalSearchStore>((set, get) => ({
  searchStates: {},

  setSearchVisible: (paneId, visible) => {
    set((state) => {
      const existing = state.searchStates[paneId] ?? defaultState()
      return {
        searchStates: {
          ...state.searchStates,
          [paneId]: { ...existing, isVisible: visible },
        },
      }
    })
  },

  setSearchNeedle: (paneId, needle) => {
    set((state) => {
      const existing = state.searchStates[paneId] ?? defaultState()
      return {
        searchStates: {
          ...state.searchStates,
          [paneId]: { ...existing, needle },
        },
      }
    })
  },

  setSearchResult: (paneId, total, selected) => {
    set((state) => {
      const existing = state.searchStates[paneId] ?? defaultState()
      return {
        searchStates: {
          ...state.searchStates,
          [paneId]: { ...existing, total, selected },
        },
      }
    })
  },

  getSearchState: (paneId) => {
    return get().searchStates[paneId] ?? defaultState()
  },

  removePane: (paneId) => {
    set((state) => {
      const next = { ...state.searchStates }
      delete next[paneId]
      return { searchStates: next }
    })
  },
}))
