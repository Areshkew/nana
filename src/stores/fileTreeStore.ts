// Original: Muxy/Models/FileTreeState.swift
// Description: Zustand store for file tree state — entries, expansion, selection, git status, lazy loading.
//              One instance per worktree, keyed by repoPath.
// Status: Completed

import { create } from 'zustand'
import type { FileTreeEntry, FileStatus } from '../services/virtualization/treeFlattener'
import { flattenTree } from '../services/virtualization/treeFlattener'
import type { FlattenTreeResultRow } from '../services/virtualization/treeFlattener'

export type { FileTreeEntry, FileStatus }

export enum PendingEntryKind {
  File = 'file',
  Folder = 'folder',
}

export interface PendingNewEntry {
  parentPath: string
  kind: PendingEntryKind
  token: string
}

export interface FileTreeState {
  rootPath: string
  rootEntries: FileTreeEntry[]
  children: Map<string, FileTreeEntry[]>
  expanded: Set<string>
  loadingPaths: Set<string>
  hasLoadedRoot: boolean
  statuses: Map<string, FileStatus>
  dirHasChange: Set<string>
  showOnlyChanges: boolean
  selectedFilePath: string | null
  selectedPaths: Set<string>
  selectionAnchorPath: string | null
  pendingRenamePath: string | null
  pendingNewEntry: PendingNewEntry | null
  pendingDeletePaths: string[]
  cutPaths: Set<string>
  dropHighlightPath: string | null
  flattenedRows: FlattenTreeResultRow[]
  unsubscribeGitWatch: (() => void) | null

  loadRootIfNeeded: () => void
  refresh: () => void
  refreshDirectory: (dirPath: string) => void
  toggle: (entry: FileTreeEntry) => void
  expand: (path: string) => void
  selectOnly: (path: string) => void
  toggleSelection: (path: string) => void
  extendSelection: (path: string) => void
  clearSelection: () => void
  revealFile: (filePath: string) => void
  setShowOnlyChanges: (value: boolean) => void
  setPendingRename: (path: string | null) => void
  beginNewEntry: (parentPath: string, kind: PendingEntryKind) => void
  cancelNewEntry: () => void
  commitNewEntryDone: () => void
  setPendingDeletePaths: (paths: string[]) => void
  clearPendingDelete: () => void
  setCutPaths: (paths: Set<string>) => void
  setDropHighlight: (path: string | null) => void
  refreshStatuses: () => void
  dispose: () => void
}

function normalizedRoot(rootPath: string): string {
  return rootPath.endsWith('/') ? rootPath.slice(0, -1) : rootPath
}

function rebuildFlattened(state: FileTreeState): FlattenTreeResultRow[] {
  return flattenTree({
    rootEntries: state.rootEntries,
    expanded: state.expanded,
    children: state.children,
    statuses: state.statuses,
    dirHasChange: state.dirHasChange,
    showOnlyChanges: state.showOnlyChanges,
  })
}

export function createFileTreeStore(rootPath: string) {
  return create<FileTreeState>()((set, get) => ({
    rootPath,
    rootEntries: [],
    children: new Map(),
    expanded: new Set(),
    loadingPaths: new Set(),
    hasLoadedRoot: false,
    statuses: new Map(),
    dirHasChange: new Set(),
    showOnlyChanges: false,
    selectedFilePath: null,
    selectedPaths: new Set(),
    selectionAnchorPath: null,
    pendingRenamePath: null,
    pendingNewEntry: null,
    pendingDeletePaths: [],
    cutPaths: new Set(),
    dropHighlightPath: null,
    flattenedRows: [],
    unsubscribeGitWatch: null,

    loadRootIfNeeded: () => {
      const s = get()
      if (s.hasLoadedRoot) return
      set({ hasLoadedRoot: true })
      get().refresh()

      const root = normalizedRoot(s.rootPath)
      void window.electronAPI.gitWatchStart(root).catch(() => undefined)
      const unsub = window.electronAPI.onGitDirectoryChanged((changedPath: string) => {
        if (changedPath === root || changedPath.startsWith(root + '/')) {
          get().refresh()
        }
      })
      set({ unsubscribeGitWatch: unsub })
    },

    refresh: () => {
      const { rootPath } = get()
      const root = normalizedRoot(rootPath)
      void window.electronAPI.fileTreeReadDirectory(root, root).then((entries) => {
        const state = get()
        if (state.rootPath !== rootPath) return
        const newState = { rootEntries: entries }
        set({ ...newState, flattenedRows: rebuildFlattened({ ...get(), ...newState }) })
      })

      const { expanded } = get()
      for (const dirPath of expanded) {
        void window.electronAPI.fileTreeReadDirectory(dirPath, root).then((entries) => {
          const state = get()
          if (state.rootPath !== rootPath) return
          const newChildren = new Map(state.children)
          newChildren.set(dirPath, entries)
          const newState = { children: newChildren }
          set({ ...newState, flattenedRows: rebuildFlattened({ ...get(), ...newState }) })
        })
      }

      get().refreshStatuses()
    },

    refreshDirectory: (dirPath: string) => {
      const { rootPath } = get()
      const root = normalizedRoot(rootPath)
      const normalized = dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath
      if (normalized === root) {
        void window.electronAPI.fileTreeReadDirectory(root, root).then((entries) => {
          const newState = { rootEntries: entries }
          set({ ...newState, flattenedRows: rebuildFlattened({ ...get(), ...newState }) })
        })
      } else {
        void window.electronAPI.fileTreeReadDirectory(normalized, root).then((entries) => {
          const state = get()
          const newChildren = new Map(state.children)
          newChildren.set(normalized, entries)
          const newState = { children: newChildren }
          set({ ...newState, flattenedRows: rebuildFlattened({ ...get(), ...newState }) })
        })
      }
      get().refreshStatuses()
    },

    toggle: (entry: FileTreeEntry) => {
      if (!entry.isDirectory) return
      const state = get()
      const newExpanded = new Set(state.expanded)
      if (newExpanded.has(entry.absolutePath)) {
        newExpanded.delete(entry.absolutePath)
        const newState = { expanded: newExpanded }
        set({ ...newState, flattenedRows: rebuildFlattened({ ...get(), ...newState }) })
      } else {
        newExpanded.add(entry.absolutePath)
        const root = normalizedRoot(state.rootPath)
        set({ expanded: newExpanded, loadingPaths: new Set([...state.loadingPaths, entry.absolutePath]) })
        void window.electronAPI.fileTreeReadDirectory(entry.absolutePath, root).then((entries) => {
          const current = get()
          const newChildren = new Map(current.children)
          newChildren.set(entry.absolutePath, entries)
          const newLoading = new Set(current.loadingPaths)
          newLoading.delete(entry.absolutePath)
          const newState = { children: newChildren, loadingPaths: newLoading }
          set({ ...newState, flattenedRows: rebuildFlattened({ ...get(), ...newState }) })
        })
      }
    },

    expand: (path: string) => {
      const state = get()
      const normalized = path.endsWith('/') ? path.slice(0, -1) : path
      const root = normalizedRoot(state.rootPath)
      if (normalized === root) return
      if (state.expanded.has(normalized)) return
      const newExpanded = new Set(state.expanded)
      newExpanded.add(normalized)
      set({ expanded: newExpanded, loadingPaths: new Set([...state.loadingPaths, normalized]) })
      void window.electronAPI.fileTreeReadDirectory(normalized, root).then((entries) => {
        const current = get()
        const newChildren = new Map(current.children)
        newChildren.set(normalized, entries)
        const newLoading = new Set(current.loadingPaths)
        newLoading.delete(normalized)
        const newState = { children: newChildren, loadingPaths: newLoading }
        set({ ...newState, flattenedRows: rebuildFlattened({ ...get(), ...newState }) })
      })
    },

    selectOnly: (path: string) => {
      set({
        selectedFilePath: path,
        selectedPaths: new Set([path]),
        selectionAnchorPath: path,
      })
    },

    toggleSelection: (path: string) => {
      const { selectedPaths, selectedFilePath } = get()
      const newSelected = new Set(selectedPaths)
      let newPrimary = selectedFilePath
      if (newSelected.has(path)) {
        newSelected.delete(path)
        if (newPrimary === path) {
          newPrimary = newSelected.values().next().value ?? null
        }
      } else {
        newSelected.add(path)
        newPrimary = path
      }
      set({ selectedFilePath: newPrimary, selectedPaths: newSelected, selectionAnchorPath: path })
    },

    extendSelection: (path: string) => {
      const state = get()
      const rows = state.flattenedRows
      const orderedPaths = rows.map((r) => r.key)
      const endIdx = orderedPaths.indexOf(path)
      if (endIdx === -1) {
        set({ selectedPaths: new Set([path]), selectedFilePath: path, selectionAnchorPath: path })
        return
      }
      const anchor = state.selectionAnchorPath ?? state.selectedFilePath ?? path
      const startIdx = orderedPaths.indexOf(anchor)
      if (startIdx === -1) {
        set({ selectedPaths: new Set([path]), selectedFilePath: path, selectionAnchorPath: path })
        return
      }
      const lo = Math.min(startIdx, endIdx)
      const hi = Math.max(startIdx, endIdx)
      const newSelected = new Set(orderedPaths.slice(lo, hi + 1))
      set({ selectedPaths: newSelected, selectedFilePath: path })
    },

    clearSelection: () => {
      set({ selectedFilePath: null, selectedPaths: new Set(), selectionAnchorPath: null })
    },

    revealFile: (filePath: string) => {
      const { rootPath } = get()
      const root = normalizedRoot(rootPath)
      set({ selectedFilePath: filePath, selectedPaths: new Set([filePath]), selectionAnchorPath: filePath })
      if (!filePath.startsWith(root + '/')) return
      const relative = filePath.slice(root.length + 1)
      const components = relative.split('/')
      if (components.length <= 1) return
      let current = root
      const toExpand: string[] = []
      for (let i = 0; i < components.length - 1; i++) {
        current += '/' + components[i]
        toExpand.push(current)
      }
      const state = get()
      const newExpanded = new Set(state.expanded)
      let needsRebuild = false
      for (const dir of toExpand) {
        if (!newExpanded.has(dir)) {
          newExpanded.add(dir)
          needsRebuild = true
        }
      }
      if (!needsRebuild) return

      set({
        expanded: newExpanded,
        loadingPaths: new Set([...state.loadingPaths, ...toExpand.filter((d) => !state.children.has(d))]),
      })

      const loadPromises = toExpand
        .filter((d) => !state.children.has(d))
        .map((dir) =>
          window.electronAPI.fileTreeReadDirectory(dir, root).then((entries) => ({ dir, entries })),
        )

      void Promise.all(loadPromises).then((results) => {
        const current = get()
        const newChildren = new Map(current.children)
        const newLoading = new Set(current.loadingPaths)
        for (const { dir, entries } of results) {
          newChildren.set(dir, entries)
          newLoading.delete(dir)
        }
        const newState = { children: newChildren, loadingPaths: newLoading }
        set({ ...newState, flattenedRows: rebuildFlattened({ ...get(), ...newState }) })
      })
    },

    setShowOnlyChanges: (value: boolean) => {
      const newState = { showOnlyChanges: value }
      set({ ...newState, flattenedRows: rebuildFlattened({ ...get(), ...newState }) })
    },

    setPendingRename: (path: string | null) => {
      set({ pendingRenamePath: path })
    },

    beginNewEntry: (parentPath: string, kind: PendingEntryKind) => {
      set({
        pendingNewEntry: { parentPath, kind, token: crypto.randomUUID() },
      })
    },

    cancelNewEntry: () => {
      set({ pendingNewEntry: null })
    },

    commitNewEntryDone: () => {
      set({ pendingNewEntry: null })
    },

    setPendingDeletePaths: (paths: string[]) => {
      set({ pendingDeletePaths: paths })
    },

    clearPendingDelete: () => {
      set({ pendingDeletePaths: [] })
    },

    setCutPaths: (paths: Set<string>) => {
      set({ cutPaths: paths })
    },

    setDropHighlight: (path: string | null) => {
      set({ dropHighlightPath: path })
    },

    refreshStatuses: () => {
      const { rootPath } = get()
      const root = normalizedRoot(rootPath)
      void window.electronAPI.fileTreeGitStatusPaths(root).then((rawStatuses) => {
        const state = get()
        if (state.rootPath !== rootPath) return
        const statuses = new Map<string, FileStatus>()
        const dirtyDirs = new Set<string>()
        for (const [relPath, statusStr] of Object.entries(rawStatuses)) {
          const absolute = root + '/' + relPath
          const trimmed = absolute.endsWith('/') ? absolute.slice(0, -1) : absolute
          statuses.set(trimmed, statusStr as FileStatus)
          const parts = trimmed.split('/')
          for (let i = parts.length - 1; i > 0; i--) {
            const dir = parts.slice(0, i).join('/')
            if (dir.length <= root.length) break
            if (dirtyDirs.has(dir)) break
            dirtyDirs.add(dir)
          }
        }
        const newState = { statuses, dirHasChange: dirtyDirs }
        set({ ...newState, flattenedRows: rebuildFlattened({ ...get(), ...newState }) })
      })
    },

    dispose: () => {
      const { unsubscribeGitWatch, rootPath } = get()
      if (unsubscribeGitWatch) unsubscribeGitWatch()
      void window.electronAPI.gitWatchStop(normalizedRoot(rootPath)).catch(() => undefined)
    },
  }))
}

export type FileTreeStoreApi = ReturnType<typeof createFileTreeStore>
