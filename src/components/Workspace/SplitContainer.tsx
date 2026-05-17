// Original: Muxy/Views/Workspace/SplitContainer.swift
// Description: Split with resize handle using react-resizable-panels.
// Status: ✅ Completed

import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { type SplitBranch } from '../../models/split'
import { type DropResult } from '../../models/drag'
import { PaneNode } from './PaneNode'

interface SplitContainerProps {
  branch: SplitBranch
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

export function SplitContainer({
  branch,
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
}: SplitContainerProps): JSX.Element {
  const direction = branch.direction === 'horizontal' ? 'horizontal' : 'vertical'

  return (
    <PanelGroup direction={direction} className="h-full w-full">
      <Panel defaultSize={branch.ratio * 100} minSize={15}>
        <PaneNode
          node={branch.first}
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
      </Panel>
      <PanelResizeHandle
        className={`relative flex-shrink-0 bg-white/10 transition-colors hover:bg-blue-500/50 ${
          direction === 'horizontal' ? 'w-1' : 'h-1'
        }`}
        style={{ cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize' }}
      >
        <div
          className={`absolute ${
            direction === 'horizontal'
              ? 'inset-y-0 -left-1 w-3'
              : 'inset-x-0 -top-1 h-3'
          }`}
        />
      </PanelResizeHandle>
      <Panel defaultSize={(1 - branch.ratio) * 100} minSize={15}>
        <PaneNode
          node={branch.second}
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
      </Panel>
    </PanelGroup>
  )
}
