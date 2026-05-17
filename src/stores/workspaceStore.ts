// Original: Muxy/Models/WorkspaceReducer.swift + TabReducer.swift + SplitReducer.swift + FocusReducer.swift
// Description: Workspace state per worktree with reducers ported to pure Zustand actions.
// Status: ✅ Completed

import { create } from 'zustand'
import {
  type SplitNode,
  type SplitDirection,
  type SplitPosition,
  splitting,
  splittingWithTab,
  removing,
  findArea,
  replaceArea,
  allAreas,
  areaFrames,
  updateBranchRatio,
} from '../models/split'
import {
  type TabArea,
  createTabArea,
  createTabInArea,
  createVCSTabInArea,
  createChatTabInArea,
  createBrowserTabInArea,
  createEditorTabInArea,
  createExternalEditorTabInArea,
  createDiffViewerTabInArea,
  createSimulatorTabInArea,
  createTabInDirectory,
  closeTab as closeTabInArea,
  selectTab as selectTabInArea,
  selectTabByIndex as selectTabByIndexInArea,
  selectNextTab as selectNextTabInArea,
  selectPreviousTab as selectPreviousTabInArea,
  insertExistingTab,
  pinTab as pinTabInArea,
} from '../models/tabArea'
import { type TabMoveRequest } from '../models/drag'
import { useSettingsStore } from './settingsStore'
import { retainForMove } from '../services/terminalLifecycle'

export type WorktreeKey = string

function makeKey(projectID: string, worktreeID: string): WorktreeKey {
  return `${projectID}:${worktreeID}`
}

export interface WorkspaceSideEffects {
  paneIDsToRemove: string[]
  projectIDsToRemove: string[]
  worktreeSwitches: { projectID: string; worktreeID: string }[]
}

export interface WorkspaceState {
  activeProjectID: string | null
  activeWorktreeID: Record<string, string>
  workspaceRoots: Record<WorktreeKey, SplitNode>
  focusedAreaID: Record<WorktreeKey, string>
  focusHistory: Record<WorktreeKey, string[]>
  keepProjectOpenWhenEmpty: boolean

  // Side effects accumulator (consumed by actions)
  lastEffects: WorkspaceSideEffects | null

  // Actions
  ensureWorkspace: (projectID: string, worktreeID: string, worktreePath: string) => void
  createTab: (projectID: string, areaID?: string) => void
  createTabInDirectory: (projectID: string, directory: string, areaID?: string) => void
  createVCSTab: (projectID: string, areaID?: string) => void
  createChatTab: (projectID: string, areaID?: string, provider?: string) => void
  createBrowserTab: (projectID: string, url: string, areaID?: string) => void
  createEditorTab: (projectID: string, filePath: string, areaID?: string) => void
  createDiffViewerTab: (
    projectID: string,
    filePath: string,
    isStaged: boolean,
    areaID?: string,
  ) => void
  createSimulatorTab: (projectID: string, areaID?: string) => void
  closeTab: (projectID: string, areaID: string, tabID: string) => void
  selectTab: (projectID: string, areaID: string, tabID: string) => void
  selectTabByIndex: (projectID: string, areaID: string, index: number) => void
  selectNextTab: (projectID: string) => void
  selectPreviousTab: (projectID: string) => void
  splitArea: (
    projectID: string,
    areaID: string,
    direction: SplitDirection,
    position: SplitPosition,
  ) => void
  closeArea: (projectID: string, areaID: string) => void
  moveTab: (projectID: string, request: TabMoveRequest) => void
  focusArea: (projectID: string, areaID: string) => void
  focusPane: (projectID: string, direction: 'left' | 'right' | 'up' | 'down') => void
  navigate: (
    projectID: string,
    worktreeID: string,
    areaID: string,
    tabID?: string,
  ) => void
  removeProject: (projectID: string) => void
  removeWorktree: (projectID: string, worktreeID: string) => void
  setKeepProjectOpenWhenEmpty: (value: boolean) => void
  setWorkspaceRoot: (key: WorktreeKey, root: SplitNode) => void
  setBranchRatio: (projectID: string, branchID: string, ratio: number) => void
  setPaneTitle: (projectID: string, paneId: string, title: string) => void
  createEditorTabPreview: (projectID: string, filePath: string, areaID?: string) => void
  createEditorTabPinned: (projectID: string, filePath: string, areaID?: string) => void
  createDiffViewerTabPreview: (
    projectID: string,
    filePath: string,
    isStaged: boolean,
    areaID?: string,
  ) => void
  createDiffViewerTabPinned: (
    projectID: string,
    filePath: string,
    isStaged: boolean,
    areaID?: string,
  ) => void
  pinTab: (tabID: string) => void
}

const focusHistoryLimit = 20

function activeKey(state: WorkspaceState, projectID: string): WorktreeKey | null {
  const worktreeID = state.activeWorktreeID[projectID]
  if (!worktreeID) return null
  return makeKey(projectID, worktreeID)
}

function resolveArea(
  state: WorkspaceState,
  key: WorktreeKey,
  areaID?: string,
): TabArea | undefined {
  const root = state.workspaceRoots[key]
  if (!root) return undefined
  if (areaID) return findArea(root, areaID)
  const focusedID = state.focusedAreaID[key]
  if (!focusedID) return undefined
  return findArea(root, focusedID)
}

function focusArea(state: WorkspaceState, areaID: string, key: WorktreeKey): WorkspaceState {
  const current = state.focusedAreaID[key]
  if (current && current !== areaID) {
    const history = [...(state.focusHistory[key] ?? [])]
    history.push(current)
    if (history.length > focusHistoryLimit) {
      history.splice(0, history.length - focusHistoryLimit)
    }
    return {
      ...state,
      focusedAreaID: { ...state.focusedAreaID, [key]: areaID },
      focusHistory: { ...state.focusHistory, [key]: history },
    }
  }
  return {
    ...state,
    focusedAreaID: { ...state.focusedAreaID, [key]: areaID },
  }
}

function popFocusHistory(
  state: WorkspaceState,
  key: WorktreeKey,
  validAreas: TabArea[],
): string | undefined {
  const history = [...(state.focusHistory[key] ?? [])]
  const validIDs = new Set(validAreas.map((a) => a.id))
  while (history.length > 0) {
    const last = history.pop()
    if (last && validIDs.has(last)) {
      return last
    }
  }
  return undefined
}

function replaceAreaInState(state: WorkspaceState, key: WorktreeKey, areaID: string, newArea: TabArea): WorkspaceState {
  const root = state.workspaceRoots[key]
  if (!root) return state
  return {
    ...state,
    workspaceRoots: {
      ...state.workspaceRoots,
      [key]: replaceArea(root, areaID, newArea),
    },
  }
}

function collectPaneIDs(root: SplitNode): string[] {
  const ids: string[] = []
  for (const area of allAreas(root)) {
    for (const tab of area.tabs) {
      if (tab.content.kind === 'terminal') {
        ids.push(tab.content.pane.id)
      }
    }
  }
  return ids
}

function clearWorkspace(state: WorkspaceState, key: WorktreeKey): WorkspaceState {
  const nextRoots = { ...state.workspaceRoots }
  delete nextRoots[key]
  const nextFocused = { ...state.focusedAreaID }
  delete nextFocused[key]
  const nextHistory = { ...state.focusHistory }
  delete nextHistory[key]
  return {
    ...state,
    workspaceRoots: nextRoots,
    focusedAreaID: nextFocused,
    focusHistory: nextHistory,
  }
}

function handleProjectEmptiedIfNeeded(
  state: WorkspaceState,
  projectID: string,
  effects: WorkspaceSideEffects,
  clearedKey: WorktreeKey,
): { state: WorkspaceState; effects: WorkspaceSideEffects } {
  const hasAnyWorkspace = Object.keys(state.workspaceRoots).some((k) =>
    k.startsWith(`${projectID}:`),
  )
  if (hasAnyWorkspace) {
    const clearedWorktreeID = clearedKey.split(':')[1]
    if (state.activeWorktreeID[projectID] === clearedWorktreeID) {
      const another = Object.keys(state.workspaceRoots).find((k) =>
        k.startsWith(`${projectID}:`),
      )
      if (another) {
        const nextWorktreeID = another.split(':')[1]
        return {
          state: {
            ...state,
            activeWorktreeID: {
              ...state.activeWorktreeID,
              [projectID]: nextWorktreeID,
            },
          },
          effects: {
            ...effects,
            worktreeSwitches: [
              ...effects.worktreeSwitches,
              { projectID, worktreeID: nextWorktreeID },
            ],
          },
        }
      }
    }
    return { state, effects }
  }
  if (state.keepProjectOpenWhenEmpty) return { state, effects }
  const nextWorktreeID = { ...state.activeWorktreeID }
  delete nextWorktreeID[projectID]
  const nextActiveProjectID =
    state.activeProjectID === projectID ? null : state.activeProjectID
  return {
    state: {
      ...state,
      activeWorktreeID: nextWorktreeID,
      activeProjectID: nextActiveProjectID,
    },
    effects: {
      ...effects,
      projectIDsToRemove: [...effects.projectIDsToRemove, projectID],
    },
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeProjectID: null,
  activeWorktreeID: {},
  workspaceRoots: {},
  focusedAreaID: {},
  focusHistory: {},
  keepProjectOpenWhenEmpty: false,
  lastEffects: null,

  ensureWorkspace: (projectID: string, worktreeID: string, worktreePath: string) => {
    const key = makeKey(projectID, worktreeID)
    set((state) => {
      if (state.workspaceRoots[key]) return state
      const area = createTabArea(worktreePath)
      return {
        ...state,
        workspaceRoots: { ...state.workspaceRoots, [key]: { type: 'tabArea' as const, area } },
        focusedAreaID: { ...state.focusedAreaID, [key]: area.id },
      }
    })
  },

  createTab: (projectID: string, areaID?: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = areaID ? findArea(state.workspaceRoots[key], areaID) : resolveArea(state, key)
      if (!area) return state
      const nextArea = createTabInArea(area)
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  createTabInDirectory: (projectID: string, directory: string, areaID?: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = areaID ? findArea(state.workspaceRoots[key], areaID) : resolveArea(state, key)
      if (!area) return state
      const nextArea = createTabInDirectory(area, directory)
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  createVCSTab: (projectID: string, areaID?: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = areaID ? findArea(state.workspaceRoots[key], areaID) : resolveArea(state, key)
      if (!area) return state
      const nextArea = createVCSTabInArea(area)
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  createChatTab: (projectID: string, areaID?: string, provider = 'claude') => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = areaID ? findArea(state.workspaceRoots[key], areaID) : resolveArea(state, key)
      if (!area) return state
      const nextArea = createChatTabInArea(area, provider)
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  createBrowserTab: (projectID: string, url: string, areaID?: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = areaID ? findArea(state.workspaceRoots[key], areaID) : resolveArea(state, key)
      if (!area) return state
      const nextArea = createBrowserTabInArea(area, url)
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  createEditorTab: (projectID: string, filePath: string, areaID?: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = areaID ? findArea(state.workspaceRoots[key], areaID) : resolveArea(state, key)
      if (!area) return state
      const settings = useSettingsStore.getState()
      let nextArea: TabArea
      if (settings.defaultEditor === 'terminal') {
        const command = settings.externalEditorCommand.trim()
        nextArea = command
          ? createExternalEditorTabInArea(area, filePath, command)
          : createEditorTabInArea(area, filePath, false)
      } else {
        nextArea = createEditorTabInArea(area, filePath, false)
      }
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  createDiffViewerTab: (
    projectID: string,
    filePath: string,
    isStaged: boolean,
    areaID?: string,
  ) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = areaID ? findArea(state.workspaceRoots[key], areaID) : resolveArea(state, key)
      if (!area) return state
      const nextArea = createDiffViewerTabInArea(area, filePath, isStaged, false)
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  createEditorTabPreview: (projectID: string, filePath: string, areaID?: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = areaID ? findArea(state.workspaceRoots[key], areaID) : resolveArea(state, key)
      if (!area) return state
      const settings = useSettingsStore.getState()
      let nextArea: TabArea
      if (settings.defaultEditor === 'terminal') {
        const command = settings.externalEditorCommand.trim()
        nextArea = command
          ? createExternalEditorTabInArea(area, filePath, command)
          : createEditorTabInArea(area, filePath, false)
      } else {
        nextArea = createEditorTabInArea(area, filePath, false)
      }
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  createEditorTabPinned: (projectID: string, filePath: string, areaID?: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = areaID ? findArea(state.workspaceRoots[key], areaID) : resolveArea(state, key)
      if (!area) return state
      const settings = useSettingsStore.getState()
      let nextArea: TabArea
      if (settings.defaultEditor === 'terminal') {
        const command = settings.externalEditorCommand.trim()
        nextArea = command
          ? createExternalEditorTabInArea(area, filePath, command)
          : createEditorTabInArea(area, filePath, true)
      } else {
        nextArea = createEditorTabInArea(area, filePath, true)
      }
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  createDiffViewerTabPreview: (
    projectID: string,
    filePath: string,
    isStaged: boolean,
    areaID?: string,
  ) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = areaID ? findArea(state.workspaceRoots[key], areaID) : resolveArea(state, key)
      if (!area) return state
      const nextArea = createDiffViewerTabInArea(area, filePath, isStaged, false)
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  createDiffViewerTabPinned: (
    projectID: string,
    filePath: string,
    isStaged: boolean,
    areaID?: string,
  ) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = areaID ? findArea(state.workspaceRoots[key], areaID) : resolveArea(state, key)
      if (!area) return state
      const nextArea = createDiffViewerTabInArea(area, filePath, isStaged, true)
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  pinTab: (tabID: string) => {
    set((state) => {
      let changed = false
      const roots = { ...state.workspaceRoots }
      for (const key of Object.keys(roots)) {
        const areas = allAreas(roots[key])
        for (const area of areas) {
          const hasTab = area.tabs.some((t) => t.id === tabID)
          if (hasTab) {
            const pinnedArea = pinTabInArea(area, tabID)
            if (pinnedArea !== area) {
              roots[key] = replaceArea(roots[key], area.id, pinnedArea)
              changed = true
            }
          }
        }
      }
      if (!changed) return state
      return { ...state, workspaceRoots: roots, lastEffects: null }
    })
  },

  createSimulatorTab: (projectID: string, areaID?: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = areaID ? findArea(state.workspaceRoots[key], areaID) : resolveArea(state, key)
      if (!area) return state
      const nextArea = createSimulatorTabInArea(area)
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  closeTab: (projectID: string, areaID: string, tabID: string) => {
    // Check if we should close the whole area instead — do this outside set()
    // to avoid nested set() conflicts.
    const current = get()
    const key = activeKey(current, projectID)
    if (!key) return
    const root = current.workspaceRoots[key]
    if (!root) return
    const area = findArea(root, areaID)
    if (!area) return

    const areaCount = allAreas(root).length
    if (area.tabs.length <= 1 && areaCount > 1) {
      get().closeArea(projectID, areaID)
      return
    }

    set((state) => {
      const { area: nextArea, removedPaneID } = closeTabInArea(area, tabID)
      let effects: WorkspaceSideEffects = { paneIDsToRemove: [], projectIDsToRemove: [], worktreeSwitches: [] }
      if (removedPaneID) effects.paneIDsToRemove.push(removedPaneID)

      let nextState = replaceAreaInState(state, key, areaID, nextArea)

      if (nextArea.tabs.length === 0) {
        nextState = clearWorkspace(nextState, key)
        const res = handleProjectEmptiedIfNeeded(nextState, projectID, effects, key)
        nextState = res.state
        effects = res.effects
      }

      return { ...nextState, lastEffects: effects }
    })
  },

  selectTab: (projectID: string, areaID: string, tabID: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = findArea(state.workspaceRoots[key], areaID)
      if (!area) return state
      const nextArea = selectTabInArea(area, tabID)
      let nextState = replaceAreaInState(state, key, areaID, nextArea)
      nextState = focusArea(nextState, areaID, key)
      return { ...nextState, lastEffects: null }
    })
  },

  selectTabByIndex: (projectID: string, areaID: string, index: number) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = findArea(state.workspaceRoots[key], areaID)
      if (!area) return state
      const nextArea = selectTabByIndexInArea(area, index)
      let nextState = replaceAreaInState(state, key, areaID, nextArea)
      nextState = focusArea(nextState, areaID, key)
      return { ...nextState, lastEffects: null }
    })
  },

  selectNextTab: (projectID: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = resolveArea(state, key)
      if (!area) return state
      const nextArea = selectNextTabInArea(area)
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  selectPreviousTab: (projectID: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const area = resolveArea(state, key)
      if (!area) return state
      const nextArea = selectPreviousTabInArea(area)
      let nextState = replaceAreaInState(state, key, area.id, nextArea)
      nextState = focusArea(nextState, area.id, key)
      return { ...nextState, lastEffects: null }
    })
  },

  splitArea: (projectID: string, areaID: string, direction: SplitDirection, position: SplitPosition) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const root = state.workspaceRoots[key]
      if (!root) return state
      const result = splitting(root, areaID, direction, position)
      if (!result.newAreaID) return state
      let nextState: WorkspaceState = {
        ...state,
        workspaceRoots: { ...state.workspaceRoots, [key]: result.node },
      }
      nextState = focusArea(nextState, result.newAreaID, key)
      return { ...nextState, lastEffects: null }
    })
  },

  closeArea: (projectID: string, areaID: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const root = state.workspaceRoots[key]
      if (!root) return state

      const effects: WorkspaceSideEffects = { paneIDsToRemove: [], projectIDsToRemove: [], worktreeSwitches: [] }
      const area = findArea(root, areaID)
      if (area) {
        const paneIDs = area.tabs
          .filter((t): t is typeof t & { content: { kind: 'terminal'; pane: { id: string } } } => t.content.kind === 'terminal')
          .map((t) => t.content.pane.id)
        effects.paneIDsToRemove.push(...paneIDs)
      }

      const newRoot = removing(root, areaID)
      if (newRoot === null) {
        // Root was the only area
        const nextState = clearWorkspace(state, key)
        const res = handleProjectEmptiedIfNeeded(nextState, projectID, effects, key)
        return { ...res.state, lastEffects: res.effects }
      }

      let nextState: WorkspaceState = {
        ...state,
        workspaceRoots: { ...state.workspaceRoots, [key]: newRoot },
      }

      const nextHistory = [...(state.focusHistory[key] ?? [])]
      const filteredHistory = nextHistory.filter((id) => id !== areaID)
      nextState = { ...nextState, focusHistory: { ...nextState.focusHistory, [key]: filteredHistory } }

      if (state.focusedAreaID[key] === areaID) {
        const remaining = allAreas(newRoot)
        const previousID = popFocusHistory(nextState, key, remaining)
        nextState = {
          ...nextState,
          focusedAreaID: {
            ...nextState.focusedAreaID,
            [key]: previousID ?? remaining[0]?.id ?? '',
          },
        }
      }

      return { ...nextState, lastEffects: effects }
    })
  },

  moveTab: (projectID: string, request: TabMoveRequest) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const root = state.workspaceRoots[key]
      if (!root) return state

      const sourceArea = findArea(root, request.sourceAreaID)
      if (sourceArea) {
        const tab = sourceArea.tabs.find((t) => t.id === request.tabID)
        if (tab?.content.kind === 'terminal') {
          retainForMove(tab.content.pane.id)
        }
      }

      let effects: WorkspaceSideEffects = { paneIDsToRemove: [], projectIDsToRemove: [], worktreeSwitches: [] }
      let nextState = state

      switch (request.type) {
        case 'toArea': {
          if (request.sourceAreaID === request.destinationAreaID) return state
          if (!sourceArea) return state
          const destArea = findArea(root, request.destinationAreaID)
          if (!destArea) return state
          const { area: nextSource } = closeTabInArea(sourceArea, request.tabID)
          // Do NOT kill the pane — the tab (and its PTY) is being moved, not closed.
          const nextDest = insertExistingTab(destArea, {
            ...sourceArea.tabs.find((t) => t.id === request.tabID)!,
          })
          nextState = replaceAreaInState(nextState, key, request.sourceAreaID, nextSource)
          nextState = replaceAreaInState(nextState, key, request.destinationAreaID, nextDest)
          nextState = focusArea(nextState, request.destinationAreaID, key)

          if (nextSource.tabs.length === 0) {
            const newRoot = removing(nextState.workspaceRoots[key], request.sourceAreaID)
            if (newRoot !== null) {
              nextState = {
                ...nextState,
                workspaceRoots: { ...nextState.workspaceRoots, [key]: newRoot },
              }
            } else {
              nextState = clearWorkspace(nextState, key)
              const res = handleProjectEmptiedIfNeeded(nextState, projectID, effects, key)
              nextState = res.state
              effects = res.effects
            }
          }
          break
        }
        case 'toNewSplit': {
          const sourceArea = findArea(root, request.sourceAreaID)
          if (!sourceArea) return state
          const { area: nextSource } = closeTabInArea(sourceArea, request.tabID)
          const shouldCollapseSource = nextSource.tabs.length === 0

          nextState = replaceAreaInState(nextState, key, request.sourceAreaID, nextSource)

          if (shouldCollapseSource && request.sourceAreaID !== request.targetAreaID) {
            const collapsedRoot = removing(nextState.workspaceRoots[key], request.sourceAreaID)
            if (collapsedRoot !== null) {
              nextState = {
                ...nextState,
                workspaceRoots: { ...nextState.workspaceRoots, [key]: collapsedRoot },
              }
            }
          }

          const currentRoot = nextState.workspaceRoots[key]
          if (!currentRoot) break
          const tab = sourceArea.tabs.find((t) => t.id === request.tabID)
          if (!tab) break
          const splitResult = splittingWithTab(
            currentRoot,
            request.targetAreaID,
            request.split.direction,
            request.split.position,
            tab,
          )
          nextState = {
            ...nextState,
            workspaceRoots: { ...nextState.workspaceRoots, [key]: splitResult.node },
          }
          if (splitResult.newAreaID) {
            nextState = focusArea(nextState, splitResult.newAreaID, key)
          }

          if (shouldCollapseSource && request.sourceAreaID === request.targetAreaID) {
            const updatedRoot = nextState.workspaceRoots[key]
            if (updatedRoot) {
              const emptyArea = findArea(updatedRoot, request.targetAreaID)
              if (emptyArea?.tabs.length === 0) {
                const collapsedRoot = removing(updatedRoot, request.targetAreaID)
                if (collapsedRoot !== null) {
                  nextState = {
                    ...nextState,
                    workspaceRoots: { ...nextState.workspaceRoots, [key]: collapsedRoot },
                  }
                }
              }
            }
          }

          break
        }
      }

      return { ...nextState, lastEffects: effects }
    })
  },

  focusArea: (projectID: string, areaID: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      return { ...focusArea(state, areaID, key), lastEffects: null }
    })
  },

  focusPane: (projectID: string, direction: 'left' | 'right' | 'up' | 'down') => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const root = state.workspaceRoots[key]
      const focusedID = state.focusedAreaID[key]
      if (!root || !focusedID) return state

      const frames = areaFrames(root)
      const focusedFrame = frames.get(focusedID)
      if (!focusedFrame) return state

      let bestCandidate: string | undefined
      let bestScore: PaneFocusScore | undefined

      frames.forEach((candidateFrame, candidateID) => {
        if (candidateID === focusedID) return
        if (!isCandidate(candidateFrame, focusedFrame, direction)) return
        const score = scoreForCandidate(candidateFrame, focusedFrame, direction)
        if (bestScore === undefined || compareScore(score, bestScore) < 0) {
          bestCandidate = candidateID
          bestScore = score
        }
      })

      if (!bestCandidate) return state
      return { ...focusArea(state, bestCandidate, key), lastEffects: null }
    })
  },

  navigate: (projectID: string, worktreeID: string, areaID: string, tabID?: string) => {
    set((state) => {
      const key = makeKey(projectID, worktreeID)
      if (!state.workspaceRoots[key]) return state
      let nextState = state
      nextState = {
        ...nextState,
        activeProjectID: projectID,
        activeWorktreeID: { ...nextState.activeWorktreeID, [projectID]: worktreeID },
      }
      if (tabID) {
        const area = findArea(nextState.workspaceRoots[key], areaID)
        if (area) {
          const nextArea = selectTabInArea(area, tabID)
          nextState = replaceAreaInState(nextState, key, areaID, nextArea)
          nextState = focusArea(nextState, areaID, key)
        }
      } else {
        nextState = focusArea(nextState, areaID, key)
      }
      return { ...nextState, lastEffects: null }
    })
  },

  removeProject: (projectID: string) => {
    set((state) => {
      const keys = Object.keys(state.workspaceRoots).filter((k) =>
        k.startsWith(`${projectID}:`),
      )
      const paneIDsToRemove: string[] = []
      let nextState = state
      keys.forEach((key) => {
        const root = nextState.workspaceRoots[key]
        if (root) {
          paneIDsToRemove.push(...collectPaneIDs(root))
        }
        nextState = clearWorkspace(nextState, key)
      })
      const nextWorktreeID = { ...nextState.activeWorktreeID }
      delete nextWorktreeID[projectID]
      const nextActiveProjectID =
        nextState.activeProjectID === projectID ? null : nextState.activeProjectID
      return {
        ...nextState,
        activeProjectID: nextActiveProjectID,
        activeWorktreeID: nextWorktreeID,
        lastEffects: { paneIDsToRemove, projectIDsToRemove: [], worktreeSwitches: [] },
      }
    })
  },

  removeWorktree: (projectID: string, worktreeID: string) => {
    set((state) => {
      const key = makeKey(projectID, worktreeID)
      const root = state.workspaceRoots[key]
      const paneIDsToRemove = root ? collectPaneIDs(root) : []
      const nextState = clearWorkspace(state, key)
      const nextWorktreeID = { ...nextState.activeWorktreeID }
      delete nextWorktreeID[projectID]
      const another = Object.keys(nextState.workspaceRoots).find((k) =>
        k.startsWith(`${projectID}:`),
      )
      if (another) {
        nextWorktreeID[projectID] = another.split(':')[1]!
      }
      const nextActiveProjectID =
        nextState.activeProjectID === projectID && !another
          ? null
          : nextState.activeProjectID
      return {
        ...nextState,
        activeProjectID: nextActiveProjectID,
        activeWorktreeID: nextWorktreeID,
        lastEffects: { paneIDsToRemove, projectIDsToRemove: [], worktreeSwitches: [] },
      }
    })
  },

  setKeepProjectOpenWhenEmpty: (value: boolean) => {
    set({ keepProjectOpenWhenEmpty: value })
  },

  setWorkspaceRoot: (key: WorktreeKey, root: SplitNode) => {
    set((state) => ({
      ...state,
      workspaceRoots: { ...state.workspaceRoots, [key]: root },
    }))
  },

  setBranchRatio: (projectID: string, branchID: string, ratio: number) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const root = state.workspaceRoots[key]
      if (!root) return state
      return {
        ...state,
        workspaceRoots: {
          ...state.workspaceRoots,
          [key]: updateBranchRatio(root, branchID, ratio),
        },
      }
    })
  },

  setPaneTitle: (projectID: string, paneId: string, title: string) => {
    set((state) => {
      const key = activeKey(state, projectID)
      if (!key) return state
      const root = state.workspaceRoots[key]
      if (!root) return state
      const areas = allAreas(root)
      for (const area of areas) {
        const tabIndex = area.tabs.findIndex(
          (t) => t.content.kind === 'terminal' && t.content.pane.id === paneId,
        )
        if (tabIndex === -1) continue
        const nextTabs = [...area.tabs]
        const targetTab = nextTabs[tabIndex]
        if (targetTab.content.kind !== 'terminal') return state
        nextTabs[tabIndex] = {
          ...targetTab,
          content: {
            ...targetTab.content,
            pane: {
              ...targetTab.content.pane,
              title,
            },
          },
        }
        const nextArea = { ...area, tabs: nextTabs }
        return {
          ...state,
          workspaceRoots: {
            ...state.workspaceRoots,
            [key]: replaceArea(root, area.id, nextArea),
          },
        }
      }
      return state
    })
  },
}))

// Focus pane scoring (ported from FocusReducer.swift)
interface PaneFocusScore {
  overlapPenalty: number
  axisGap: number
  crossDistance: number
  centerDistance: number
}

function isCandidate(
  candidate: import('../models/split').AreaFrame,
  focused: import('../models/split').AreaFrame,
  direction: 'left' | 'right' | 'up' | 'down',
): boolean {
  switch (direction) {
    case 'left': return candidate.x + candidate.width / 2 < focused.x + focused.width / 2
    case 'right': return candidate.x + candidate.width / 2 > focused.x + focused.width / 2
    case 'up': return candidate.y + candidate.height / 2 < focused.y + focused.height / 2
    case 'down': return candidate.y + candidate.height / 2 > focused.y + focused.height / 2
  }
}

function scoreForCandidate(
  candidate: import('../models/split').AreaFrame,
  focused: import('../models/split').AreaFrame,
  direction: 'left' | 'right' | 'up' | 'down',
): PaneFocusScore {
  let overlap: number
  let axisGap: number
  let crossDistance: number
  let centerDistance: number

  const focusedMidX = focused.x + focused.width / 2
  const focusedMidY = focused.y + focused.height / 2
  const candidateMidX = candidate.x + candidate.width / 2
  const candidateMidY = candidate.y + candidate.height / 2

  switch (direction) {
    case 'left':
      overlap = Math.min(focused.y + focused.height, candidate.y + candidate.height) - Math.max(focused.y, candidate.y)
      axisGap = Math.max(0, focused.x - (candidate.x + candidate.width))
      crossDistance = Math.abs(focusedMidY - candidateMidY)
      centerDistance = Math.abs(focusedMidX - candidateMidX)
      break
    case 'right':
      overlap = Math.min(focused.y + focused.height, candidate.y + candidate.height) - Math.max(focused.y, candidate.y)
      axisGap = Math.max(0, candidate.x - (focused.x + focused.width))
      crossDistance = Math.abs(focusedMidY - candidateMidY)
      centerDistance = Math.abs(focusedMidX - candidateMidX)
      break
    case 'up':
      overlap = Math.min(focused.x + focused.width, candidate.x + candidate.width) - Math.max(focused.x, candidate.x)
      axisGap = Math.max(0, focused.y - (candidate.y + candidate.height))
      crossDistance = Math.abs(focusedMidX - candidateMidX)
      centerDistance = Math.abs(focusedMidY - candidateMidY)
      break
    case 'down':
      overlap = Math.min(focused.x + focused.width, candidate.x + candidate.width) - Math.max(focused.x, candidate.x)
      axisGap = Math.max(0, candidate.y - (focused.y + focused.height))
      crossDistance = Math.abs(focusedMidX - candidateMidX)
      centerDistance = Math.abs(focusedMidY - candidateMidY)
      break
  }

  return {
    overlapPenalty: overlap > 0 ? 0 : 1,
    axisGap,
    crossDistance,
    centerDistance,
  }
}

function compareScore(a: PaneFocusScore, b: PaneFocusScore): number {
  if (a.overlapPenalty !== b.overlapPenalty) return a.overlapPenalty - b.overlapPenalty
  if (a.axisGap !== b.axisGap) return a.axisGap - b.axisGap
  if (a.crossDistance !== b.crossDistance) return a.crossDistance - b.crossDistance
  return a.centerDistance - b.centerDistance
}
