// Original: Tests/MuxyTests/WorkspaceSnapshotTests.swift
// Description: Unit tests for workspace snapshot save/restore round-trips.

import { describe, it, expect } from 'vitest'
import {
  snapshotSplitNode,
  restoreSplitNode,
  snapshotTabArea,
  restoreTabArea,
  snapshotTerminalTab,
  restoreTerminalTab,
  snapshotAll,
  restoreAll,
  type TabAreaSnapshot,
  type TerminalTabSnapshot,
  type WorkspaceSnapshot,
} from '../workspaceSnapshot'
import {
  type SplitNode,
  allAreas,
} from '../split'
import {
  createTabArea,
  type TabArea,
} from '../tabArea'
import {
  createTerminalTab,
  createVCSTab,
  createChatTab,
  createEditorTab,
} from '../tab'

describe('TerminalTabSnapshot', () => {
  it('round-trips a terminal tab with pane title', () => {
    const original = createTerminalTab('/project')
    void original.content.kind
    if (original.content.kind === 'terminal') {
      original.content.pane.title = 'vim ~/code/app.ts'
    }
    const snap = snapshotTerminalTab(original)
    expect(snap.kind).toBe('terminal')
    expect(snap.paneTitle).toBe('vim ~/code/app.ts')
    expect(snap.isPinned).toBe(false)

    const restored = restoreTerminalTab(snap)
    expect(restored.content.kind).toBe('terminal')
    if (restored.content.kind === 'terminal') {
      expect(restored.content.pane.title).toBe('vim ~/code/app.ts')
      expect(restored.content.pane.projectPath).toBe('/project')
    }
  })

  it('round-trips a VCS tab', () => {
    const original = createVCSTab('/project')
    const snap = snapshotTerminalTab(original)
    expect(snap.kind).toBe('vcs')

    const restored = restoreTerminalTab(snap)
    expect(restored.content.kind).toBe('vcs')
  })

  it('round-trips a chat tab with provider', () => {
    const original = createChatTab('/project', 'claude')
    const snap = snapshotTerminalTab(original)
    expect(snap.kind).toBe('chat')
    expect(snap.chatProvider).toBe('claude')

    const restored = restoreTerminalTab(snap)
    expect(restored.content.kind).toBe('chat')
    if (restored.content.kind === 'chat') {
      expect(restored.content.provider).toBe('claude')
    }
  })

  it('round-trips an editor tab with filePath', () => {
    const original = createEditorTab('/project', '/project/src/app.tsx')
    const snap = snapshotTerminalTab(original)
    expect(snap.kind).toBe('editor')
    expect(snap.filePath).toBe('/project/src/app.tsx')

    const restored = restoreTerminalTab(snap)
    expect(restored.content.kind).toBe('editor')
    if (restored.content.kind === 'editor') {
      expect(restored.content.filePath).toBe('/project/src/app.tsx')
    }
  })

  it('preserves customTitle, colorID, and isPinned', () => {
    const original = createTerminalTab('/project')
    original.customTitle = 'My Tab'
    original.colorID = 'red'
    original.isPinned = true

    const snap = snapshotTerminalTab(original)
    expect(snap.customTitle).toBe('My Tab')
    expect(snap.colorID).toBe('red')
    expect(snap.isPinned).toBe(true)

    const restored = restoreTerminalTab(snap)
    expect(restored.customTitle).toBe('My Tab')
    expect(restored.colorID).toBe('red')
    expect(restored.isPinned).toBe(true)
  })

  it('handles null customTitle/colorID from snapshot', () => {
    const snap: TerminalTabSnapshot = {
      kind: 'terminal',
      customTitle: null,
      colorID: null,
      isPinned: false,
      projectPath: '/project',
      paneTitle: 'Terminal',
    }
    const restored = restoreTerminalTab(snap)
    expect(restored.customTitle).toBeNull()
    expect(restored.colorID).toBeNull()
  })
})

describe('TabAreaSnapshot', () => {
  it('round-trips a tab area with multiple tabs', () => {
    const tab1 = createTerminalTab('/project')
    const tab2 = createVCSTab('/project')
    const tab3 = createChatTab('/project', 'claude')
    const area: TabArea = {
      id: 'area-test',
      projectPath: '/project',
      tabs: [tab1, tab2, tab3],
      activeTabID: tab3.id,
      tabHistory: [tab1.id, tab2.id],
    }

    const snap = snapshotTabArea(area)
    expect(snap.tabs).toHaveLength(3)
    expect(snap.activeTabIndex).toBe(2)

    const restored = restoreTabArea(snap)
    expect(restored.id).toBe(snap.id)
    expect(restored.tabs).toHaveLength(3)
    expect(restored.tabs[0].content.kind).toBe('terminal')
    expect(restored.tabs[1].content.kind).toBe('vcs')
    expect(restored.tabs[2].content.kind).toBe('chat')
    expect(restored.activeTabID).toBe(restored.tabs[2].id)
  })

  it('handles missing activeTabIndex by defaulting to first tab', () => {
    const area = createTabArea('/project')
    const snap = snapshotTabArea(area)
    snap.activeTabIndex = null

    const restored = restoreTabArea(snap)
    expect(restored.activeTabID).toBe(restored.tabs[0].id)
  })

  it('handles out-of-range activeTabIndex', () => {
    const area = createTabArea('/project')
    const snap = snapshotTabArea(area)
    snap.activeTabIndex = 999

    const restored = restoreTabArea(snap)
    expect(restored.activeTabID).toBe(restored.tabs[0].id)
  })

  it('creates a fallback tab for empty snapshots', () => {
    const snap: TabAreaSnapshot = {
      id: 'area-1',
      projectPath: '/project',
      tabs: [],
      activeTabIndex: null,
    }
    const restored = restoreTabArea(snap)
    expect(restored.id).toBe('area-1')
    expect(restored.tabs).toHaveLength(1)
    expect(restored.tabs[0].content.kind).toBe('terminal')
  })
})

describe('SplitNodeSnapshot', () => {
  it('round-trips a single tab area leaf', () => {
    const leaf: SplitNode = { type: 'tabArea', area: createTabArea('/project') }

    const snap = snapshotSplitNode(leaf)
    expect(snap.type).toBe('tabArea')

    const restored = restoreSplitNode(snap)
    expect(restored.type).toBe('tabArea')
    if (restored.type === 'tabArea') {
      expect(restored.area.projectPath).toBe('/project')
      expect(restored.area.tabs.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('round-trips a split with two areas', () => {
    const left: SplitNode = { type: 'tabArea', area: createTabArea('/project') }
    const right: SplitNode = { type: 'tabArea', area: createTabArea('/project') }
    const root: SplitNode = {
      type: 'split',
      branch: {
        id: crypto.randomUUID(),
        direction: 'horizontal',
        ratio: 0.6,
        first: left,
        second: right,
      },
    }

    const snap = snapshotSplitNode(root)
    expect(snap.type).toBe('split')
    if (snap.type === 'split') {
      expect(snap.split.direction).toBe('horizontal')
      expect(snap.split.ratio).toBe(0.6)
    }

    const restored = restoreSplitNode(snap)
    expect(restored.type).toBe('split')
    if (restored.type === 'split') {
      expect(restored.branch.direction).toBe('horizontal')
      expect(restored.branch.ratio).toBe(0.6)
      expect(restored.branch.first.type).toBe('tabArea')
      expect(restored.branch.second.type).toBe('tabArea')
    }
  })

  it('round-trips a nested split (3 areas)', () => {
    const a: SplitNode = { type: 'tabArea', area: createTabArea('/project') }
    const b: SplitNode = { type: 'tabArea', area: createTabArea('/project') }
    const c: SplitNode = { type: 'tabArea', area: createTabArea('/project') }
    const inner: SplitNode = {
      type: 'split',
      branch: { id: crypto.randomUUID(), direction: 'vertical', ratio: 0.5, first: a, second: b },
    }
    const root: SplitNode = {
      type: 'split',
      branch: { id: crypto.randomUUID(), direction: 'horizontal', ratio: 0.5, first: inner, second: c },
    }

    const snap = snapshotSplitNode(root)
    const restored = restoreSplitNode(snap)
    expect(allAreas(restored)).toHaveLength(3)
  })
})

describe('restoreAll', () => {
  const projectID = 'proj-1'
  const worktreeID = 'wt-1'

  it('restores a workspace for a known project and worktree', () => {
    const area = createTabArea('/project')
    const rootSnap = snapshotSplitNode({ type: 'tabArea', area })

    const snapshots: WorkspaceSnapshot[] = [{
      projectID,
      worktreeID,
      worktreePath: '/project',
      focusedAreaID: area.id,
      root: rootSnap,
    }]

    const result = restoreAll(snapshots, [{ id: projectID }], {
      [projectID]: [{ id: worktreeID, path: '/project', isPrimary: true }],
    })

    expect(result).toHaveLength(1)
    expect(result[0].key.projectID).toBe(projectID)
    expect(result[0].key.worktreeID).toBe(worktreeID)
    expect(result[0].focusedAreaID).toBe(area.id)
  })

  it('skips snapshots for unknown projects', () => {
    const area = createTabArea('/project')
    const rootSnap = snapshotSplitNode({ type: 'tabArea', area })

    const snapshots: WorkspaceSnapshot[] = [{
      projectID: 'unknown',
      worktreeID,
      worktreePath: '/project',
      focusedAreaID: area.id,
      root: rootSnap,
    }]

    const result = restoreAll(snapshots, [{ id: projectID }], {})
    expect(result).toHaveLength(0)
  })

  it('falls back to worktreePath when worktreeID does not match', () => {
    const area = createTabArea('/project')
    const rootSnap = snapshotSplitNode({ type: 'tabArea', area })

    const snapshots: WorkspaceSnapshot[] = [{
      projectID,
      worktreeID: 'wrong-id',
      worktreePath: '/project',
      focusedAreaID: area.id,
      root: rootSnap,
    }]

    const result = restoreAll(snapshots, [{ id: projectID }], {
      [projectID]: [{ id: worktreeID, path: '/project', isPrimary: true }],
    })

    expect(result).toHaveLength(1)
    expect(result[0].key.worktreeID).toBe(worktreeID)
  })

  it('falls back to primary worktree when neither ID nor path match', () => {
    const area = createTabArea('/project')
    const rootSnap = snapshotSplitNode({ type: 'tabArea', area })

    const snapshots: WorkspaceSnapshot[] = [{
      projectID,
      worktreeID: 'wrong-id',
      worktreePath: '/wrong-path',
      focusedAreaID: area.id,
      root: rootSnap,
    }]

    const result = restoreAll(snapshots, [{ id: projectID }], {
      [projectID]: [{ id: worktreeID, path: '/project', isPrimary: true }],
    })

    expect(result).toHaveLength(1)
    expect(result[0].key.worktreeID).toBe(worktreeID)
  })

  it('defaults focusedAreaID to first area when saved ID is invalid', () => {
    const area = createTabArea('/project')
    const rootSnap = snapshotSplitNode({ type: 'tabArea', area })

    const snapshots: WorkspaceSnapshot[] = [{
      projectID,
      worktreeID,
      worktreePath: '/project',
      focusedAreaID: 'nonexistent-area',
      root: rootSnap,
    }]

    const result = restoreAll(snapshots, [{ id: projectID }], {
      [projectID]: [{ id: worktreeID, path: '/project', isPrimary: true }],
    })

    expect(result).toHaveLength(1)
    expect(result[0].focusedAreaID).toBe(area.id)
  })
})

describe('snapshotAll + restoreAll round-trip', () => {
  it('round-trips multiple workspace roots', () => {
    const area1 = createTabArea('/project-a')
    const area2 = createTabArea('/project-b')
    const root1: SplitNode = { type: 'tabArea', area: area1 }
    const root2: SplitNode = { type: 'tabArea', area: area2 }
    const key1 = `proj-a:wt-a`
    const key2 = `proj-b:wt-b`

    const workspaceRoots = { [key1]: root1, [key2]: root2 }
    const focusedAreaID = { [key1]: area1.id, [key2]: area2.id }

    const snapshots = snapshotAll(workspaceRoots, focusedAreaID)
    expect(snapshots).toHaveLength(2)

    const projects = [{ id: 'proj-a' }, { id: 'proj-b' }]
    const worktrees = {
      'proj-a': [{ id: 'wt-a', path: '/project-a', isPrimary: true }],
      'proj-b': [{ id: 'wt-b', path: '/project-b', isPrimary: true }],
    }

    const restored = restoreAll(snapshots, projects, worktrees)
    expect(restored).toHaveLength(2)

    const restoredA = restored.find((r) => r.key.projectID === 'proj-a')
    const restoredB = restored.find((r) => r.key.projectID === 'proj-b')
    expect(restoredA).toBeDefined()
    expect(restoredB).toBeDefined()
    expect(allAreas(restoredA!.root)).toHaveLength(1)
    expect(allAreas(restoredB!.root)).toHaveLength(1)
  })

  it('round-trips a split workspace preserving layout', () => {
    const left = createTabArea('/project')
    const right = createTabArea('/project')
    const root: SplitNode = {
      type: 'split',
      branch: {
        id: crypto.randomUUID(),
        direction: 'horizontal',
        ratio: 0.65,
        first: { type: 'tabArea', area: left },
        second: { type: 'tabArea', area: right },
      },
    }

    const key = 'proj-1:wt-1'
    const workspaceRoots = { [key]: root }
    const focusedAreaID = { [key]: left.id }

    const snapshots = snapshotAll(workspaceRoots, focusedAreaID)
    const restored = restoreAll(snapshots, [{ id: 'proj-1' }], {
      'proj-1': [{ id: 'wt-1', path: '/project', isPrimary: true }],
    })

    expect(restored).toHaveLength(1)
    expect(restored[0].root.type).toBe('split')
    if (restored[0].root.type === 'split') {
      expect(restored[0].root.branch.ratio).toBeCloseTo(0.65)
      expect(restored[0].root.branch.direction).toBe('horizontal')
    }
    expect(restored[0].focusedAreaID).toBe(left.id)
  })
})
