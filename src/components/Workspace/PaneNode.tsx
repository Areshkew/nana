// Original: Muxy/Views/Workspace/PaneNode.swift
// Description: Recursive pane renderer: tabArea → TabAreaView, split → SplitContainer.
// Status: ✅ Completed

import { type SplitNode, findArea, replaceArea } from '../../models/split'
import {
  reorderTab,
  togglePin,
  setCustomTitle,
  setTabColorID,
  createTabAdjacent,
} from '../../models/tabArea'
import { type DropResult } from '../../models/drag'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { TabAreaView } from './TabAreaView'
import { SplitContainer } from './SplitContainer'

interface PaneNodeProps {
  node: SplitNode
  focusedAreaID: string | null
  isActiveProject: boolean
  projectID: string
  onFocusArea: (areaID: string) => void
  onSelectTab: (areaID: string, tabID: string) => void
  onCreateTab: (areaID: string) => void
  onCreateVCSTab: (areaID: string) => void
  onCloseTab: (areaID: string, tabID: string) => void
  onSplit: (areaID: string, direction: 'horizontal' | 'vertical') => void
  onCloseArea: (areaID: string) => void
  onDropAction: (result: DropResult) => void
}

export function PaneNode({
  node,
  focusedAreaID,
  isActiveProject,
  projectID,
  onFocusArea,
  onSelectTab,
  onCreateTab,
  onCreateVCSTab,
  onCloseTab,
  onSplit,
  onCloseArea,
  onDropAction,
}: PaneNodeProps): JSX.Element {
  const setWorkspaceRoot = useWorkspaceStore((s) => s.setWorkspaceRoot)
  const activeWorktreeID = useWorkspaceStore((s) => s.activeWorktreeID)

  function updateArea(areaID: string, updater: (area: import('../../models/tabArea').TabArea) => import('../../models/tabArea').TabArea) {
    const worktreeID = activeWorktreeID[projectID]
    if (!worktreeID) return
    const key = `${projectID}:${worktreeID}`
    const root = useWorkspaceStore.getState().workspaceRoots[key]
    if (!root) return
    const found = findArea(root, areaID)
    if (!found) return
    const nextArea = updater(found)
    setWorkspaceRoot(key, replaceArea(root, areaID, nextArea))
  }

  switch (node.type) {
    case 'tabArea': {
      const area = node.area
      return (
        <TabAreaView
          area={area}
          isFocused={focusedAreaID === area.id}
          isActiveProject={isActiveProject}
          projectID={projectID}
          onFocus={() => onFocusArea(area.id)}
          onSelectTab={(tabID) => onSelectTab(area.id, tabID)}
          onCreateTab={() => onCreateTab(area.id)}
          onCreateVCSTab={() => onCreateVCSTab(area.id)}
          onCloseTab={(tabID) => onCloseTab(area.id, tabID)}
          onSplit={onSplit}
          onReorderTab={(oldIdx, newIdx) => {
            updateArea(area.id, (a) => reorderTab(a, oldIdx, newIdx + 1))
          }}
          onTogglePin={(tabID) => {
            updateArea(area.id, (a) => togglePin(a, tabID))
          }}
          onSetCustomTitle={(tabID, title) => {
            updateArea(area.id, (a) => setCustomTitle(a, tabID, title))
          }}
          onSetColorID={(tabID, colorID) => {
            updateArea(area.id, (a) => setTabColorID(a, tabID, colorID))
          }}
          onCreateTabAdjacent={(tabID, side) => {
            updateArea(area.id, (a) => createTabAdjacent(a, tabID, side))
          }}
          onDropAction={onDropAction}
        />
      )
    }
    case 'split': {
      return (
        <SplitContainer
          branch={node.branch}
          focusedAreaID={focusedAreaID}
          isActiveProject={isActiveProject}
          projectID={projectID}
          onFocusArea={onFocusArea}
          onSelectTab={onSelectTab}
          onCreateTab={onCreateTab}
          onCreateVCSTab={onCreateVCSTab}
          onCloseTab={onCloseTab}
          onSplit={onSplit}
          onCloseArea={onCloseArea}
          onDropAction={onDropAction}
        />
      )
    }
  }
}
