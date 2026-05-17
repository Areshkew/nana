// Original: Muxy/Models/TabDragCoordinator.swift
// Description: Drag-and-drop types for tab move and split placement.
// Status: ✅ Completed

export type DropZone = 'left' | 'right' | 'top' | 'bottom' | 'center'

export interface SplitPlacement {
  direction: 'horizontal' | 'vertical'
  position: 'first' | 'second'
}

export type TabMoveRequest =
  | { type: 'toArea'; tabID: string; sourceAreaID: string; destinationAreaID: string }
  | {
      type: 'toNewSplit'
      tabID: string
      sourceAreaID: string
      targetAreaID: string
      split: SplitPlacement
    }

export interface DragInfo {
  tabID: string
  sourceAreaID: string
  projectID: string
}

export interface DropResult {
  drag: DragInfo
  zone: DropZone
  targetAreaID: string
}

export function dropResultToMoveRequest(result: DropResult): TabMoveRequest {
  switch (result.zone) {
    case 'center':
      return {
        type: 'toArea',
        tabID: result.drag.tabID,
        sourceAreaID: result.drag.sourceAreaID,
        destinationAreaID: result.targetAreaID,
      }
    case 'left':
      return {
        type: 'toNewSplit',
        tabID: result.drag.tabID,
        sourceAreaID: result.drag.sourceAreaID,
        targetAreaID: result.targetAreaID,
        split: { direction: 'horizontal', position: 'first' },
      }
    case 'right':
      return {
        type: 'toNewSplit',
        tabID: result.drag.tabID,
        sourceAreaID: result.drag.sourceAreaID,
        targetAreaID: result.targetAreaID,
        split: { direction: 'horizontal', position: 'second' },
      }
    case 'top':
      return {
        type: 'toNewSplit',
        tabID: result.drag.tabID,
        sourceAreaID: result.drag.sourceAreaID,
        targetAreaID: result.targetAreaID,
        split: { direction: 'vertical', position: 'first' },
      }
    case 'bottom':
      return {
        type: 'toNewSplit',
        tabID: result.drag.tabID,
        sourceAreaID: result.drag.sourceAreaID,
        targetAreaID: result.targetAreaID,
        split: { direction: 'vertical', position: 'second' },
      }
  }
}
