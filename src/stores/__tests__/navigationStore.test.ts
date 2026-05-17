// Original: Tests/MuxyTests/Models/NavigationHistoryTests.swift
// Description: Tests for navigation store — back/forward, pruning, recording suppression.
// Status: Completed

import { describe, it, expect, beforeEach } from 'vitest'
import { useNavigationStore } from '../../stores/navigationStore'
import { createTabArea } from '../../models/tabArea'
import { type WorktreeKey } from '../../stores/workspaceStore'

function makeWorkspaceState(overrides: Partial<{
  activeProjectID: string | null
  activeWorktreeID: Record<string, string>
  workspaceRoots: Record<WorktreeKey, import('../../models/split').SplitNode>
  focusedAreaID: Record<WorktreeKey, string>
}> = {}): import('../../stores/workspaceStore').WorkspaceState {
  return {
    activeProjectID: overrides.activeProjectID ?? null,
    activeWorktreeID: overrides.activeWorktreeID ?? {},
    workspaceRoots: overrides.workspaceRoots ?? {},
    focusedAreaID: overrides.focusedAreaID ?? {},
    focusHistory: {},
    keepProjectOpenWhenEmpty: false,
    lastEffects: null,
  } as import('../../stores/workspaceStore').WorkspaceState
}

describe('NavigationStore', () => {
  beforeEach(() => {
    const HistoryCtor = useNavigationStore.getState().history.constructor as new () => import('../../models/navigationHistory').NavigationHistory
    useNavigationStore.setState({
      history: new HistoryCtor(),
      canGoBack: false,
      canGoForward: false,
    })
  })

  it('starts empty with no back/forward', () => {
    const s = useNavigationStore.getState()
    expect(s.canGoBack).toBe(false)
    expect(s.canGoForward).toBe(false)
    expect(s.history.entries).toHaveLength(0)
  })

  it('recordCurrentState records and enables back', () => {
    const projectID = crypto.randomUUID()
    const worktreeID = crypto.randomUUID()
    const area = createTabArea('/tmp')
    const key: WorktreeKey = `${projectID}:${worktreeID}`
    const state = makeWorkspaceState({
      activeProjectID: projectID,
      activeWorktreeID: { [projectID]: worktreeID },
      workspaceRoots: { [key]: { type: 'tabArea' as const, area } },
      focusedAreaID: { [key]: area.id },
    })
    useNavigationStore.getState().recordCurrentState(state)
    expect(useNavigationStore.getState().canGoBack).toBe(false)

    const area2 = createTabArea('/tmp2')
    const state2 = makeWorkspaceState({
      activeProjectID: projectID,
      activeWorktreeID: { [projectID]: worktreeID },
      workspaceRoots: { [key]: { type: 'tabArea' as const, area: area2 } },
      focusedAreaID: { [key]: area2.id },
    })
    useNavigationStore.getState().recordCurrentState(state2)
    expect(useNavigationStore.getState().canGoBack).toBe(true)
    expect(useNavigationStore.getState().canGoForward).toBe(false)
  })

  it('recordCurrentState dedupes consecutive identical states', () => {
    const projectID = crypto.randomUUID()
    const worktreeID = crypto.randomUUID()
    const area = createTabArea('/tmp')
    const key: WorktreeKey = `${projectID}:${worktreeID}`
    const state = makeWorkspaceState({
      activeProjectID: projectID,
      activeWorktreeID: { [projectID]: worktreeID },
      workspaceRoots: { [key]: { type: 'tabArea' as const, area } },
      focusedAreaID: { [key]: area.id },
    })
    useNavigationStore.getState().recordCurrentState(state)
    useNavigationStore.getState().recordCurrentState(state)
    useNavigationStore.getState().recordCurrentState(state)
    expect(useNavigationStore.getState().history.entries).toHaveLength(1)
  })

  it('goBack returns null when previous entries are dead', () => {
    const projectID = crypto.randomUUID()
    const worktreeID = crypto.randomUUID()
    const area1 = createTabArea('/tmp1')
    const area2 = createTabArea('/tmp2')
    const key: WorktreeKey = `${projectID}:${worktreeID}`

    const state1 = makeWorkspaceState({
      activeProjectID: projectID,
      activeWorktreeID: { [projectID]: worktreeID },
      workspaceRoots: { [key]: { type: 'tabArea' as const, area: area1 } },
      focusedAreaID: { [key]: area1.id },
    })
    const state2 = makeWorkspaceState({
      activeProjectID: projectID,
      activeWorktreeID: { [projectID]: worktreeID },
      workspaceRoots: { [key]: { type: 'tabArea' as const, area: area2 } },
      focusedAreaID: { [key]: area2.id },
    })

    useNavigationStore.getState().recordCurrentState(state1)
    useNavigationStore.getState().recordCurrentState(state2)
    expect(useNavigationStore.getState().canGoBack).toBe(true)

    const result = useNavigationStore.getState().goBack(state2)
    expect(result).toBeNull()
    expect(useNavigationStore.getState().canGoBack).toBe(false)
  })

  it('pruneDeadEntries removes entries referencing removed areas', () => {
    const projectID = crypto.randomUUID()
    const worktreeID = crypto.randomUUID()
    const area1 = createTabArea('/tmp1')
    const area2 = createTabArea('/tmp2')
    const key: WorktreeKey = `${projectID}:${worktreeID}`

    const state1 = makeWorkspaceState({
      activeProjectID: projectID,
      activeWorktreeID: { [projectID]: worktreeID },
      workspaceRoots: { [key]: { type: 'tabArea' as const, area: area1 } },
      focusedAreaID: { [key]: area1.id },
    })
    const state2 = makeWorkspaceState({
      activeProjectID: projectID,
      activeWorktreeID: { [projectID]: worktreeID },
      workspaceRoots: { [key]: { type: 'tabArea' as const, area: area2 } },
      focusedAreaID: { [key]: area2.id },
    })

    useNavigationStore.getState().recordCurrentState(state1)
    useNavigationStore.getState().recordCurrentState(state2)

    const prunedState = makeWorkspaceState({
      activeProjectID: projectID,
      activeWorktreeID: { [projectID]: worktreeID },
      workspaceRoots: { [key]: { type: 'tabArea' as const, area: area2 } },
      focusedAreaID: { [key]: area2.id },
    })
    useNavigationStore.getState().pruneDeadEntries(prunedState)
    expect(useNavigationStore.getState().history.entries).toHaveLength(1)
    expect(useNavigationStore.getState().history.entries[0].areaID).toBe(area2.id)
  })
})
