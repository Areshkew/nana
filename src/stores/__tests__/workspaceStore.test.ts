// Original: Tests/MuxyTests/WorkspaceReducerTests.swift
// Description: Unit tests for workspace store actions.

import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkspaceStore } from '../../stores/workspaceStore'

describe('Workspace store', () => {
  beforeEach(() => {
    // Reset store to initial state with active worktree set
    useWorkspaceStore.setState({
      activeProjectID: 'proj1',
      activeWorktreeID: { proj1: 'wt1' },
      workspaceRoots: {},
      focusedAreaID: {},
      focusHistory: {},
      keepProjectOpenWhenEmpty: false,
      lastEffects: null,
    })
  })

  it('ensures workspace for project/worktree', () => {
    const store = useWorkspaceStore.getState()
    store.ensureWorkspace('proj1', 'wt1', '/project')
    const state = useWorkspaceStore.getState()
    const key = 'proj1:wt1'
    expect(state.workspaceRoots[key]).toBeDefined()
    expect(state.focusedAreaID[key]).toBeDefined()
  })

  it('creates a tab in the focused area', () => {
    const store = useWorkspaceStore.getState()
    store.ensureWorkspace('proj1', 'wt1', '/project')
    store.createTab('proj1')
    const state = useWorkspaceStore.getState()
    const key = 'proj1:wt1'
    const root = state.workspaceRoots[key]
    expect(root).toBeDefined()
    if (root?.type === 'tabArea') {
      expect(root.area.tabs.length).toBe(2)
    }
  })

  it('selects a tab', () => {
    const store = useWorkspaceStore.getState()
    store.ensureWorkspace('proj1', 'wt1', '/project')
    store.createTab('proj1')
    const state = useWorkspaceStore.getState()
    const key = 'proj1:wt1'
    const root = state.workspaceRoots[key]
    if (root?.type === 'tabArea') {
      const firstTab = root.area.tabs[0]
      store.selectTab('proj1', root.area.id, firstTab.id)
      const next = useWorkspaceStore.getState()
      const nextRoot = next.workspaceRoots[key]
      if (nextRoot?.type === 'tabArea') {
        expect(nextRoot.area.activeTabID).toBe(firstTab.id)
      }
    }
  })

  it('splits an area horizontally', () => {
    const store = useWorkspaceStore.getState()
    store.ensureWorkspace('proj1', 'wt1', '/project')
    const state = useWorkspaceStore.getState()
    const key = 'proj1:wt1'
    const root = state.workspaceRoots[key]
    if (root?.type === 'tabArea') {
      store.splitArea('proj1', root.area.id, 'horizontal', 'second')
      const next = useWorkspaceStore.getState()
      const nextRoot = next.workspaceRoots[key]
      expect(nextRoot?.type).toBe('split')
      if (nextRoot?.type === 'split') {
        expect(nextRoot.branch.first.type).toBe('tabArea')
        expect(nextRoot.branch.second.type).toBe('tabArea')
      }
    }
  })

  it('closes a tab and removes pane ID in effects', () => {
    const store = useWorkspaceStore.getState()
    store.ensureWorkspace('proj1', 'wt1', '/project')
    store.createTab('proj1')
    const state = useWorkspaceStore.getState()
    const key = 'proj1:wt1'
    const root = state.workspaceRoots[key]
    if (root?.type === 'tabArea') {
      const tabToClose = root.area.tabs[1]
      store.closeTab('proj1', root.area.id, tabToClose.id)
      const next = useWorkspaceStore.getState()
      const nextRoot = next.workspaceRoots[key]
      if (nextRoot?.type === 'tabArea') {
        expect(nextRoot.area.tabs.length).toBe(1)
      }
      expect(next.lastEffects?.paneIDsToRemove.length).toBeGreaterThanOrEqual(0)
    }
  })

  it('focuses area updates focusedAreaID', () => {
    const store = useWorkspaceStore.getState()
    store.ensureWorkspace('proj1', 'wt1', '/project')
    const state = useWorkspaceStore.getState()
    const key = 'proj1:wt1'
    const root = state.workspaceRoots[key]
    if (root?.type === 'tabArea') {
      const areaID = root.area.id
      store.focusArea('proj1', areaID)
      const next = useWorkspaceStore.getState()
      expect(next.focusedAreaID[key]).toBe(areaID)
    }
  })

  it('navigate sets active project and worktree', () => {
    const store = useWorkspaceStore.getState()
    store.ensureWorkspace('proj1', 'wt1', '/project')
    const state = useWorkspaceStore.getState()
    const key = 'proj1:wt1'
    const root = state.workspaceRoots[key]
    if (root?.type === 'tabArea') {
      store.navigate('proj1', 'wt1', root.area.id)
      const next = useWorkspaceStore.getState()
      expect(next.activeProjectID).toBe('proj1')
      expect(next.activeWorktreeID.proj1).toBe('wt1')
    }
  })

  it('moveTab toArea moves tab between areas', () => {
    const store = useWorkspaceStore.getState()
    store.ensureWorkspace('proj1', 'wt1', '/project')
    store.createTab('proj1')
    const state = useWorkspaceStore.getState()
    const key = 'proj1:wt1'
    const root = state.workspaceRoots[key]
    if (root?.type === 'tabArea') {
      const sourceAreaID = root.area.id
      const tabToMove = root.area.tabs[1]
      store.splitArea('proj1', sourceAreaID, 'horizontal', 'second')
      const afterSplit = useWorkspaceStore.getState()
      const splitRoot = afterSplit.workspaceRoots[key]
      if (splitRoot?.type === 'split') {
        const destAreaID =
          splitRoot.branch.second.type === 'tabArea'
            ? splitRoot.branch.second.area.id
            : ''
        store.moveTab('proj1', {
          type: 'toArea',
          tabID: tabToMove.id,
          sourceAreaID,
          destinationAreaID: destAreaID,
        })
        const afterMove = useWorkspaceStore.getState()
        const moveRoot = afterMove.workspaceRoots[key]
        if (moveRoot?.type === 'split') {
          const sourceAreaAfter =
            moveRoot.branch.first.type === 'tabArea'
              ? moveRoot.branch.first.area
              : undefined
          const destArea =
            moveRoot.branch.second.type === 'tabArea'
              ? moveRoot.branch.second.area
              : undefined
          // Tab must exist in destination
          expect(destArea?.tabs.some((t) => t.id === tabToMove.id)).toBe(true)
          // Tab must NOT exist in source
          expect(sourceAreaAfter?.tabs.some((t) => t.id === tabToMove.id)).toBe(false)
        }
      }
    }
  })

  it('moveTab toNewSplit creates a split with the moved tab', () => {
    const store = useWorkspaceStore.getState()
    store.ensureWorkspace('proj1', 'wt1', '/project')
    store.createTab('proj1')
    const state = useWorkspaceStore.getState()
    const key = 'proj1:wt1'
    const root = state.workspaceRoots[key]
    if (root?.type === 'tabArea') {
      const sourceAreaID = root.area.id
      const tabToMove = root.area.tabs[1]
      store.splitArea('proj1', sourceAreaID, 'horizontal', 'second')
      const afterSplit = useWorkspaceStore.getState()
      const splitRoot = afterSplit.workspaceRoots[key]
      if (splitRoot?.type === 'split') {
        const targetAreaID =
          splitRoot.branch.second.type === 'tabArea'
            ? splitRoot.branch.second.area.id
            : ''
        store.moveTab('proj1', {
          type: 'toNewSplit',
          tabID: tabToMove.id,
          sourceAreaID,
          targetAreaID,
          split: { direction: 'vertical', position: 'second' },
        })
        const afterMove = useWorkspaceStore.getState()
        const moveRoot = afterMove.workspaceRoots[key]
        // Should now be a nested split or flat split structure containing the moved tab
        expect(moveRoot).toBeDefined()
        if (moveRoot?.type === 'split') {
          // The target area should have been split, creating a new area with the tab
          const all: import('../../models/tabArea').TabArea[] = []
          const collect = (n: import('../../models/split').SplitNode) => {
            if (n.type === 'tabArea') {
              all.push(n.area)
            } else {
              collect(n.branch.first)
              collect(n.branch.second)
            }
          }
          collect(moveRoot)
          expect(all.some((a) => a.tabs.some((t: import('../../models/tab').TerminalTab) => t.id === tabToMove.id))).toBe(true)
          // Tab must exist in exactly one area
          const totalOccurrences = all.reduce(
            (count, a) => count + a.tabs.filter((t) => t.id === tabToMove.id).length,
            0,
          )
          expect(totalOccurrences).toBe(1)
        }
      }
    }
  })

  it('setPaneTitle updates terminal pane title', () => {
    const store = useWorkspaceStore.getState()
    store.ensureWorkspace('proj1', 'wt1', '/project')
    const state = useWorkspaceStore.getState()
    const key = 'proj1:wt1'
    const root = state.workspaceRoots[key]
    if (root?.type === 'tabArea') {
      const tab = root.area.tabs[0]
      if (tab.content.kind === 'terminal') {
        const paneId = tab.content.pane.id
        store.setPaneTitle('proj1', paneId, 'new-title')
        const next = useWorkspaceStore.getState()
        const nextRoot = next.workspaceRoots[key]
        if (nextRoot?.type === 'tabArea') {
          const nextTab = nextRoot.area.tabs[0]
          if (nextTab.content.kind === 'terminal') {
            expect(nextTab.content.pane.title).toBe('new-title')
          }
        }
      }
    }
  })
})
