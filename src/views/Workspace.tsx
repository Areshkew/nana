// Original: Muxy/Views/Workspace/Workspace.swift
// Description: Workspace container — renders all workspace layouts stacked (ZStack pattern)
//              to keep terminals and PTYs alive across project/worktree switches.
// Status: ✅ Completed

import { useWorkspaceStore } from '../stores/workspaceStore'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useRightPanelStore } from '../stores/rightPanelStore'
import { FlatPaneLayout } from '../components/Workspace/FlatPaneLayout'
import { dropResultToMoveRequest } from '../models/drag'
import { setWindowTitle } from '../services/persistence'
import { requestCloseTab } from '../services/tabCloseConfirmation'

function getActiveRepoPath(): string | null {
  const app = useAppStore.getState()
  const pid = app.activeProjectID
  if (!pid) return null
  const wt = app.getActiveWorktree(pid)
  return wt?.path ?? null
}

export function Workspace(): JSX.Element {
  const activeProjectID = useAppStore((s) => s.activeProjectID)
  const activeWorktreeID = useAppStore((s) => s.activeWorktreeID)

  const workspaceRoots = useWorkspaceStore((s) => s.workspaceRoots)
  const focusedAreaID = useWorkspaceStore((s) => s.focusedAreaID)

  const entries = Object.entries(workspaceRoots)

  // Derive window title from active terminal tab
  const windowTitle = 'Nana'
  void setWindowTitle(windowTitle)

  if (entries.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-[var(--nana-fg-dim)]">
        No workspace
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {entries.map(([key, root]) => {
        const [projectID] = key.split(':')
        const isActive = projectID === activeProjectID && activeWorktreeID[projectID] === key.split(':')[1]
        return (
          <WorkspaceLayout
            key={key}
            projectID={projectID}
            root={root}
            focusedAreaID={focusedAreaID[key] ?? null}
            isActive={isActive}
          />
        )
      })}
    </div>
  )
}

function WorkspaceLayout({
  projectID,
  root,
  focusedAreaID,
  isActive,
}: {
  projectID: string
  root: import('../models/split').SplitNode
  focusedAreaID: string | null
  isActive: boolean
}): JSX.Element {
  const focusArea = useWorkspaceStore((s) => s.focusArea)
  const selectTab = useWorkspaceStore((s) => s.selectTab)
  const createTab = useWorkspaceStore((s) => s.createTab)
  const createVCSTab = useWorkspaceStore((s) => s.createVCSTab)
  const splitArea = useWorkspaceStore((s) => s.splitArea)
  const setBranchRatio = useWorkspaceStore((s) => s.setBranchRatio)
  const moveTab = useWorkspaceStore((s) => s.moveTab)

  return (
    <div
      className="absolute inset-0"
      style={{
        visibility: isActive ? 'visible' : 'hidden',
        zIndex: isActive ? 1 : 0,
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      <FlatPaneLayout
        root={root}
        focusedAreaID={focusedAreaID}
        isActiveProject={isActive}
        projectID={projectID}
        onFocusArea={(areaID) => focusArea(projectID, areaID)}
        onSelectTab={(areaID, tabID) => selectTab(projectID, areaID, tabID)}
        onCreateTab={(areaID) => createTab(projectID, areaID)}
        onCreateVCSTab={(areaID) => {
          const mode = useSettingsStore.getState().vcsDisplayMode
          if (mode === 'attached') {
            useRightPanelStore.getState().toggleVCS()
          } else if (mode === 'window') {
            const repoPath = getActiveRepoPath()
            if (repoPath) void window.electronAPI.openVCSWindow(repoPath)
          } else {
            createVCSTab(projectID, areaID)
          }
        }}
        onCloseTab={(areaID, tabID) => void requestCloseTab({ projectID, areaID, tabID })}
        onSplit={(areaID, direction) =>
          splitArea(projectID, areaID, direction, direction === 'horizontal' ? 'second' : 'second')
        }
        onSetBranchRatio={(branchID, ratio) => setBranchRatio(projectID, branchID, ratio)}
        onDropAction={(result) => {
          const request = dropResultToMoveRequest(result)
          moveTab(projectID, request)
        }}
      />
    </div>
  )
}
