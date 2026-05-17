// Original: Muxy/Models/AppState.swift (navigation history integration)
// Description: Zustand store for navigation history — back/forward with dead-entry pruning.
// Status: Completed

import { create, type StoreApi } from 'zustand'
import { NavigationHistory, type NavigationEntry } from '../models/navigationHistory'
import { findArea } from '../models/split'
import { type WorkspaceState, type WorktreeKey } from './workspaceStore'

function makeKey(projectID: string, worktreeID: string): WorktreeKey {
  return `${projectID}:${worktreeID}`
}

interface NavigationState {
  history: NavigationHistory
  canGoBack: boolean
  canGoForward: boolean

  recordCurrentState: (state: WorkspaceState) => void
  goBack: (state: WorkspaceState) => NavigationEntry | null
  goForward: (state: WorkspaceState) => NavigationEntry | null
  pruneDeadEntries: (state: WorkspaceState) => void
}

function makeEntryFromState(state: WorkspaceState): NavigationEntry | null {
  const projectID = state.activeProjectID
  if (!projectID) return null
  const worktreeID = state.activeWorktreeID[projectID]
  if (!worktreeID) return null
  const key = makeKey(projectID, worktreeID)
  const root = state.workspaceRoots[key]
  if (!root) return null
  const focusedAreaID = state.focusedAreaID[key]
  if (!focusedAreaID) return null
  const area = findArea(root, focusedAreaID)
  if (!area) return null
  const activeTab = area.tabs.find((t) => t.id === area.activeTabID)
  return {
    projectID,
    worktreeID,
    areaID: focusedAreaID,
    tabID: activeTab?.id ?? null,
  }
}

function isEntryLive(entry: NavigationEntry, state: WorkspaceState): boolean {
  const key = makeKey(entry.projectID, entry.worktreeID)
  const root = state.workspaceRoots[key]
  if (!root) return false
  const area = findArea(root, entry.areaID)
  if (!area) return false
  if (entry.tabID) {
    return area.tabs.some((t) => t.id === entry.tabID)
  }
  return true
}

function step(
  history: NavigationHistory,
  delta: number,
  state: WorkspaceState,
): NavigationEntry | null {
  let candidate = history.cursor + delta
  while (candidate >= 0 && candidate < history.entries.length) {
    const entry = history.entries[candidate]
    if (isEntryLive(entry, state)) {
      history.setCursor(candidate)
      return entry
    }
    history.removeEntry(candidate)
    if (delta < 0) {
      candidate = history.cursor + delta
    }
  }
  return null
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  history: new NavigationHistory(),
  canGoBack: false,
  canGoForward: false,

  recordCurrentState: (state: WorkspaceState) => {
    const entry = makeEntryFromState(state)
    if (!entry) return
    get().history.record(entry)
    const h = get().history
    set({ canGoBack: h.canGoBack, canGoForward: h.canGoForward })
  },

  goBack: (state: WorkspaceState) => {
    const h = get().history
    if (!h.canGoBack) return null
    const result = h.performWithRecordingSuppressed(() =>
      step(h, -1, state),
    )
    set({ canGoBack: h.canGoBack, canGoForward: h.canGoForward })
    return result
  },

  goForward: (state: WorkspaceState) => {
    const h = get().history
    if (!h.canGoForward) return null
    const result = h.performWithRecordingSuppressed(() =>
      step(h, 1, state),
    )
    set({ canGoBack: h.canGoBack, canGoForward: h.canGoForward })
    return result
  },

  pruneDeadEntries: (state: WorkspaceState) => {
    const h = get().history
    h.removeEntries((entry) => !isEntryLive(entry, state))
    if (h.entries.length === 0) {
      set({ canGoBack: false, canGoForward: false })
      return
    }
    const cur = h.current
    if (cur && isEntryLive(cur, state)) {
      set({ canGoBack: h.canGoBack, canGoForward: h.canGoForward })
      return
    }
    set({ canGoBack: h.canGoBack, canGoForward: h.canGoForward })
  },
}))

export function subscribeNavigationToWorkspace(workspaceStore: StoreApi<WorkspaceState>): () => void {
  let lastRecorded = ''
  const unsubscribe = workspaceStore.subscribe((state) => {
    const projectID = state.activeProjectID
    const worktreeID = projectID ? (state.activeWorktreeID[projectID] ?? '') : ''
    const key = projectID && worktreeID ? makeKey(projectID, worktreeID) : ''
    const focusedAreaID = key ? (state.focusedAreaID[key] ?? '') : ''
    let activeTabID = ''
    if (focusedAreaID) {
      const root = state.workspaceRoots[key]
      if (root) {
        const area = findArea(root, focusedAreaID)
        if (area) {
          activeTabID = area.activeTabID ?? ''
        }
      }
    }
    const snapshot = `${projectID ?? ''}:${worktreeID}:${focusedAreaID}:${activeTabID}`
    if (snapshot === lastRecorded) return
    lastRecorded = snapshot
    const navStore = useNavigationStore.getState()
    navStore.recordCurrentState(state)
    navStore.pruneDeadEntries(state)
  })
  return unsubscribe
}
