// Original: Muxy/Models/EditorTabState.swift
// Description: Per-tab editor metadata store. CodeMirror manages actual text state;
//              this tracks isModified, cursor position, loading state per tab.
// Status: 🚧 In progress

import { create } from 'zustand'

export interface EditorMeta {
  isLoading: boolean
  isModified: boolean
  cursorLine: number
  cursorColumn: number
  errorMessage: string | null
  awaitingLargeFileConfirmation: boolean
  largeFileSize: number
  searchVisible: boolean
}

interface EditorState {
  editors: Map<string, EditorMeta>
  getEditor: (tabId: string) => EditorMeta
  initEditor: (tabId: string) => void
  removeEditor: (tabId: string) => void
  setLoading: (tabId: string, isLoading: boolean) => void
  setModified: (tabId: string, isModified: boolean) => void
  setCursor: (tabId: string, line: number, column: number) => void
  setError: (tabId: string, message: string | null) => void
  setAwaitingLargeFile: (tabId: string, awaiting: boolean, size: number) => void
  showSearch: (tabId: string) => void
  hideSearch: (tabId: string) => void
}

const defaultMeta = (): EditorMeta => ({
  isLoading: true,
  isModified: false,
  cursorLine: 1,
  cursorColumn: 1,
  errorMessage: null,
  awaitingLargeFileConfirmation: false,
  largeFileSize: 0,
  searchVisible: false,
})

export const LARGE_FILE_WARNING_THRESHOLD = 5 * 1024 * 1024
export const LARGE_FILE_REFUSE_THRESHOLD = 50 * 1024 * 1024

export const useEditorStore = create<EditorState>((set, get) => ({
  editors: new Map(),

  getEditor: (tabId: string): EditorMeta => {
    return get().editors.get(tabId) ?? defaultMeta()
  },

  initEditor: (tabId: string) => {
    set((state) => {
      if (state.editors.has(tabId)) return state
      const next = new Map(state.editors)
      next.set(tabId, defaultMeta())
      return { editors: next }
    })
  },

  removeEditor: (tabId: string) => {
    set((state) => {
      if (!state.editors.has(tabId)) return state
      const next = new Map(state.editors)
      next.delete(tabId)
      return { editors: next }
    })
  },

  setLoading: (tabId: string, isLoading: boolean) => {
    set((state) => {
      const meta = state.editors.get(tabId)
      if (!meta) return state
      const next = new Map(state.editors)
      next.set(tabId, { ...meta, isLoading })
      return { editors: next }
    })
  },

  setModified: (tabId: string, isModified: boolean) => {
    set((state) => {
      const meta = state.editors.get(tabId)
      if (!meta || meta.isModified === isModified) return state
      const next = new Map(state.editors)
      next.set(tabId, { ...meta, isModified })
      return { editors: next }
    })
  },

  setCursor: (tabId: string, line: number, column: number) => {
    set((state) => {
      const meta = state.editors.get(tabId)
      if (!meta) return state
      const next = new Map(state.editors)
      next.set(tabId, { ...meta, cursorLine: line, cursorColumn: column })
      return { editors: next }
    })
  },

  setError: (tabId: string, message: string | null) => {
    set((state) => {
      const meta = state.editors.get(tabId)
      if (!meta) return state
      const next = new Map(state.editors)
      next.set(tabId, { ...meta, errorMessage: message, isLoading: false })
      return { editors: next }
    })
  },

  setAwaitingLargeFile: (tabId: string, awaiting: boolean, size: number) => {
    set((state) => {
      const meta = state.editors.get(tabId)
      if (!meta) return state
      const next = new Map(state.editors)
      next.set(tabId, { ...meta, awaitingLargeFileConfirmation: awaiting, largeFileSize: size, isLoading: false })
      return { editors: next }
    })
  },

  showSearch: (tabId: string) => {
    set((state) => {
      const meta = state.editors.get(tabId)
      if (!meta || meta.searchVisible) return state
      const next = new Map(state.editors)
      next.set(tabId, { ...meta, searchVisible: true })
      return { editors: next }
    })
  },

  hideSearch: (tabId: string) => {
    set((state) => {
      const meta = state.editors.get(tabId)
      if (!meta?.searchVisible) return state
      const next = new Map(state.editors)
      next.set(tabId, { ...meta, searchVisible: false })
      return { editors: next }
    })
  },
}))
