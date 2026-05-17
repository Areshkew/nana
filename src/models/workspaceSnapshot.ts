// Original: Muxy/Models/WorkspaceSnapshot.swift
// Description: Workspace snapshot DTOs for persistence — save/restore workspace layouts across restarts.
// Status: Completed

import { z } from 'zod'
import {
  type SplitNode,
  type SplitDirection,
  type SplitBranch,
  allAreas,
  findArea,
} from './split'
import {
  type TabArea,
} from './tabArea'
import {
  type TerminalTab,
  type TabContent,
  type TerminalPaneState,
  createTerminalTab,
} from './tab'
import {
  type WorktreeKey,
} from './worktree'

export const terminalTabSnapshotSchema = z.object({
  kind: z.enum(['terminal', 'vcs', 'editor', 'diffViewer', 'chat', 'browser', 'simulator']).default('terminal'),
  customTitle: z.string().nullable().optional(),
  colorID: z.string().nullable().optional(),
  isPinned: z.boolean().default(false),
  projectPath: z.string(),
  paneTitle: z.string().default('Terminal'),
  filePath: z.string().nullable().optional(),
  chatProvider: z.string().nullable().optional(),
  browserURL: z.string().nullable().optional(),
})

export type TerminalTabSnapshot = z.infer<typeof terminalTabSnapshotSchema>

export const tabAreaSnapshotSchema = z.object({
  id: z.string(),
  projectPath: z.string(),
  tabs: z.array(terminalTabSnapshotSchema),
  activeTabIndex: z.number().nullable().optional(),
})

export interface TabAreaSnapshot {
  id: string
  projectPath: string
  tabs: TerminalTabSnapshot[]
  activeTabIndex: number | null | undefined
}

export interface SplitBranchSnapshot {
  direction: SplitDirection
  ratio: number
  first: SplitNodeSnapshot
  second: SplitNodeSnapshot
}

export type SplitNodeSnapshot =
  | { type: 'tabArea'; tabArea: TabAreaSnapshot }
  | { type: 'split'; split: SplitBranchSnapshot }

export const workspaceSnapshotSchema = z.object({
  projectID: z.string(),
  worktreeID: z.string().nullable().optional(),
  worktreePath: z.string().nullable().optional(),
  focusedAreaID: z.string().nullable().optional(),
  root: z.unknown(),
})

export type WorkspaceSnapshot = z.infer<typeof workspaceSnapshotSchema>

export interface RestoredWorkspace {
  key: WorktreeKey
  root: SplitNode
  focusedAreaID: string
}

export function snapshotTerminalTab(tab: TerminalTab): TerminalTabSnapshot {
  const content = tab.content
  const snapshot: TerminalTabSnapshot = {
    kind: content.kind,
    customTitle: tab.customTitle,
    colorID: tab.colorID,
    isPinned: tab.isPinned,
    projectPath: getProjectPathFromContent(content),
    paneTitle: 'Terminal',
  }

  switch (content.kind) {
    case 'terminal':
      snapshot.paneTitle = content.pane.title
      break
    case 'editor':
    case 'diffViewer':
      snapshot.filePath = content.filePath
      break
    case 'chat':
      snapshot.chatProvider = content.provider
      break
    case 'browser':
      snapshot.browserURL = content.currentURL
      break
  }

  return snapshot
}

export function restoreTerminalTab(snapshot: TerminalTabSnapshot): TerminalTab {
  const id = crypto.randomUUID()
  const paneID = crypto.randomUUID()

  let content: TabContent
  switch (snapshot.kind) {
    case 'terminal': {
      const pane: TerminalPaneState = {
        id: paneID,
        projectPath: snapshot.projectPath,
        title: snapshot.paneTitle ?? 'Terminal',
      }
      content = { kind: 'terminal', pane }
      break
    }
    case 'vcs':
      content = { kind: 'vcs', projectPath: snapshot.projectPath }
      break
    case 'editor':
      content = {
        kind: 'editor',
        projectPath: snapshot.projectPath,
        filePath: snapshot.filePath ?? '',
        displayTitle: snapshot.filePath?.split(/[\\/]/).pop() ?? 'Editor',
      }
      break
    case 'diffViewer':
      content = {
        kind: 'diffViewer',
        projectPath: snapshot.projectPath,
        filePath: snapshot.filePath ?? '',
        isStaged: false,
        displayTitle: snapshot.filePath?.split(/[\\/]/).pop() ?? 'Diff',
      }
      break
    case 'chat':
      content = {
        kind: 'chat',
        projectPath: snapshot.projectPath,
        provider: snapshot.chatProvider ?? 'claude',
        displayTitle: snapshot.chatProvider ?? 'Claude',
      }
      break
    case 'browser':
      content = {
        kind: 'browser',
        projectPath: snapshot.projectPath,
        currentURL: snapshot.browserURL ?? 'about:blank',
        displayTitle: 'Browser',
      }
      break
    case 'simulator':
      content = {
        kind: 'simulator',
        projectPath: snapshot.projectPath,
        displayTitle: 'Simulator',
      }
      break
  }

  return {
    id,
    customTitle: snapshot.customTitle ?? null,
    colorID: snapshot.colorID ?? null,
    isPinned: snapshot.isPinned,
    content,
  }
}

export function snapshotTabArea(area: TabArea): TabAreaSnapshot {
  const persistedTabs = area.tabs.filter((t) =>
    !(t.content.kind === 'diffViewer')
  )
  const activeIndex = persistedTabs.findIndex((t) => t.id === area.activeTabID)
  return {
    id: area.id,
    projectPath: area.projectPath,
    tabs: persistedTabs.map(snapshotTerminalTab),
    activeTabIndex: activeIndex >= 0 ? activeIndex : null,
  }
}

export function restoreTabArea(snapshot: TabAreaSnapshot): TabArea {
  const tabs = snapshot.tabs.map(restoreTerminalTab)
  let activeTabID: string | null = null
  const index = snapshot.activeTabIndex
  if (index !== null && index !== undefined && index >= 0 && index < tabs.length) {
    activeTabID = tabs[index].id
  } else if (tabs.length > 0) {
    activeTabID = tabs[0].id
  }

  if (tabs.length === 0) {
    const tab = createTerminalTab(snapshot.projectPath)
    return {
      id: snapshot.id,
      projectPath: snapshot.projectPath,
      tabs: [tab],
      activeTabID: tab.id,
      tabHistory: [],
    }
  }

  return {
    id: snapshot.id,
    projectPath: snapshot.projectPath,
    tabs,
    activeTabID,
    tabHistory: [],
  }
}

export function snapshotSplitNode(node: SplitNode): SplitNodeSnapshot {
  switch (node.type) {
    case 'tabArea':
      return { type: 'tabArea', tabArea: snapshotTabArea(node.area) }
    case 'split': {
      const branch: SplitBranch = node.branch
      return {
        type: 'split',
        split: {
          direction: branch.direction,
          ratio: branch.ratio,
          first: snapshotSplitNode(branch.first),
          second: snapshotSplitNode(branch.second),
        },
      }
    }
  }
}

export function restoreSplitNode(snapshot: SplitNodeSnapshot): SplitNode {
  switch (snapshot.type) {
    case 'tabArea':
      return { type: 'tabArea', area: restoreTabArea(snapshot.tabArea) }
    case 'split': {
      const branchSnap = snapshot.split
      const first = restoreSplitNode(branchSnap.first)
      const second = restoreSplitNode(branchSnap.second)
      return {
        type: 'split',
        branch: {
          id: crypto.randomUUID(),
          direction: branchSnap.direction,
          ratio: branchSnap.ratio,
          first,
          second,
        },
      }
    }
  }
}

export function snapshotAll(
  workspaceRoots: Record<string, SplitNode>,
  focusedAreaID: Record<string, string>,
): WorkspaceSnapshot[] {
  const snapshots: WorkspaceSnapshot[] = []
  for (const [key, root] of Object.entries(workspaceRoots)) {
    const parts = key.split(':')
    const projectID = parts[0] ?? ''
    const worktreeID = parts[1] ?? ''
    let worktreePath: string | null = null
    if (root.type === 'tabArea') {
      worktreePath = root.area.projectPath
    } else {
      const areas = allAreas(root)
      if (areas.length > 0) {
        worktreePath = areas[0].projectPath
      }
    }
    snapshots.push({
      projectID,
      worktreeID,
      worktreePath,
      focusedAreaID: focusedAreaID[key] ?? null,
      root: snapshotSplitNode(root),
    })
  }
  return snapshots
}

export interface WorktreeLike {
  id: string
  path: string
  isPrimary: boolean
}

export interface ProjectLike {
  id: string
}

export function restoreAll(
  snapshots: WorkspaceSnapshot[],
  projects: ProjectLike[],
  worktrees: Record<string, WorktreeLike[]>,
): RestoredWorkspace[] {
  const projectIDs = new Set(projects.map((p) => p.id))
  const results: RestoredWorkspace[] = []

  for (const snapshot of snapshots) {
    if (!projectIDs.has(snapshot.projectID)) continue
    const worktreeList = worktrees[snapshot.projectID] ?? []
    const targetWorktree = resolveWorktree(snapshot, worktreeList)
    if (!targetWorktree) continue

    const root = restoreSplitNode(snapshot.root as SplitNodeSnapshot)
    const areas = allAreas(root)
    if (areas.length === 0) continue

    let focusedID: string
    if (snapshot.focusedAreaID && findArea(root, snapshot.focusedAreaID)) {
      focusedID = snapshot.focusedAreaID
    } else {
      focusedID = areas[0].id
    }

    const key: WorktreeKey = {
      projectID: snapshot.projectID,
      worktreeID: targetWorktree.id,
    }
    results.push({ key, root, focusedAreaID: focusedID })
  }

  return results
}

function resolveWorktree(
  snapshot: WorkspaceSnapshot,
  worktrees: WorktreeLike[],
): WorktreeLike | undefined {
  if (snapshot.worktreeID) {
    const match = worktrees.find((w) => w.id === snapshot.worktreeID)
    if (match) return match
  }
  if (snapshot.worktreePath) {
    const match = worktrees.find((w) => w.path === snapshot.worktreePath)
    if (match) return match
  }
  return worktrees.find((w) => w.isPrimary) ?? worktrees[0]
}

function getProjectPathFromContent(content: TabContent): string {
  switch (content.kind) {
    case 'terminal': return content.pane.projectPath
    case 'vcs': return content.projectPath
    case 'editor': return content.projectPath
    case 'diffViewer': return content.projectPath
    case 'chat': return content.projectPath
    case 'browser': return content.projectPath
    case 'simulator': return content.projectPath
  }
}
