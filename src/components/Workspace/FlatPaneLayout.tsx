// Original: Muxy/Views/Workspace/SplitContainer.swift
// Description: Flat layout rendering — all areas as absolute siblings to preserve mount state.
// Status: ✅ Completed

import { useRef, useCallback } from 'react'
import {
  type SplitNode,
  type AreaFrame,
  layoutItems,
  findArea,
  replaceArea,
  areaFrames,
} from '../../models/split'
import {
  reorderTab,
  togglePin,
  setCustomTitle,
  setTabColorID,
  createTabAdjacent,
} from '../../models/tabArea'
import { type DropResult } from '../../models/drag'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useDragStore } from '../../stores/dragStore'
import { useMountEffect } from '../../hooks/useMountEffect'
import { TabAreaView } from './TabAreaView'

interface FlatPaneLayoutProps {
  root: SplitNode
  focusedAreaID: string | null
  isActiveProject: boolean
  projectID: string
  onFocusArea: (areaID: string) => void
  onSelectTab: (areaID: string, tabID: string) => void
  onCreateTab: (areaID: string) => void
  onCreateVCSTab: (areaID: string) => void
  onCloseTab: (areaID: string, tabID: string) => void
  onSplit: (areaID: string, direction: 'horizontal' | 'vertical') => void
  onSetBranchRatio: (branchID: string, ratio: number) => void
  onDropAction: (result: DropResult) => void
}

export function FlatPaneLayout({
  root,
  focusedAreaID,
  isActiveProject,
  projectID,
  onFocusArea,
  onSelectTab,
  onCreateTab,
  onCreateVCSTab,
  onCloseTab,
  onSplit,
  onSetBranchRatio,
  onDropAction,
}: FlatPaneLayoutProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)
  const setWorkspaceRoot = useWorkspaceStore((s) => s.setWorkspaceRoot)
  const activeWorktreeID = useWorkspaceStore((s) => s.activeWorktreeID)

  function updateArea(
    areaID: string,
    updater: (area: import('../../models/tabArea').TabArea) => import('../../models/tabArea').TabArea,
  ) {
    const worktreeID = activeWorktreeID[projectID]
    if (!worktreeID) return
    const key = `${projectID}:${worktreeID}`
    const currentRoot = useWorkspaceStore.getState().workspaceRoots[key]
    if (!currentRoot) return
    const found = findArea(currentRoot, areaID)
    if (!found) return
    const nextArea = updater(found)
    setWorkspaceRoot(key, replaceArea(currentRoot, areaID, nextArea))
  }

  // Sync area frames with dragStore during active drag
  const syncFrames = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const currentRoot = root
    const frames01 = areaFrames(currentRoot)
    const viewportFrames = new Map<string, AreaFrame>()
    frames01.forEach((frame, id) => {
      viewportFrames.set(id, {
        x: rect.left + frame.x * rect.width,
        y: rect.top + frame.y * rect.height,
        width: frame.width * rect.width,
        height: frame.height * rect.height,
      })
    })
    useDragStore.getState().setAreaFrames(projectID, viewportFrames)
  }, [root, projectID])

  const syncFramesRef = useRef(syncFrames)
  syncFramesRef.current = syncFrames

  useMountEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(() => {
      if (useDragStore.getState().activeDrag) {
        syncFramesRef.current()
      }
    })
    ro.observe(el)

    const unsubscribe = useDragStore.subscribe((state, prev) => {
      if (state.activeDrag && !prev.activeDrag) {
        syncFramesRef.current()
      }
    })

    return () => {
      ro.disconnect()
      unsubscribe()
      dragCleanupRef.current?.()
    }
  })

  const items = layoutItems(root)
  const areas = items.filter((i) => i.type === 'area')
  const dividers = items.filter((i) => i.type === 'divider')

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, branchID: string, direction: 'horizontal' | 'vertical', currentRatio: number) => {
      e.preventDefault()
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const startX = e.clientX
      const startY = e.clientY
      let raf = 0

      function handleMouseMove(moveEvent: MouseEvent) {
        let newRatio: number
        if (direction === 'horizontal') {
          const deltaX = moveEvent.clientX - startX
          newRatio = currentRatio + deltaX / rect.width
        } else {
          const deltaY = moveEvent.clientY - startY
          newRatio = currentRatio + deltaY / rect.height
        }
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() => {
          onSetBranchRatio(branchID, newRatio)
        })
      }

      function handleMouseUp() {
        cancelAnimationFrame(raf)
        dragCleanupRef.current = null
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      const cleanup = (): void => {
        cancelAnimationFrame(raf)
        dragCleanupRef.current = null
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      dragCleanupRef.current = cleanup
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [onSetBranchRatio],
  )

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {areas.map((item) => {
        const area = findArea(root, item.id)
        if (!area) return null
        return (
          <div
            key={item.id}
            className="absolute overflow-hidden"
            style={{
              left: `${item.frame.x * 100}%`,
              top: `${item.frame.y * 100}%`,
              width: `${item.frame.width * 100}%`,
              height: `${item.frame.height * 100}%`,
            }}
          >
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
          </div>
        )
      })}

      {dividers.map((item) => (
        <div
          key={item.id}
          className="absolute z-20"
          style={{
            left:
              item.direction === 'horizontal'
                ? `calc(${item.frame.x * 100}% - 2px)`
                : `${item.frame.x * 100}%`,
            top:
              item.direction === 'vertical'
                ? `calc(${item.frame.y * 100}% - 2px)`
                : `${item.frame.y * 100}%`,
            width: item.direction === 'horizontal' ? '5px' : `${item.frame.width * 100}%`,
            height: item.direction === 'vertical' ? '5px' : `${item.frame.height * 100}%`,
            cursor: item.direction === 'horizontal' ? 'col-resize' : 'row-resize',
          }}
          onMouseDown={(e) =>
            handleResizeStart(e, item.id, item.direction!, item.ratio!)
          }
        >
          <div
            className="h-full w-full bg-white/10 transition-colors hover:bg-blue-500/50"
            style={{
              marginLeft: item.direction === 'horizontal' ? '2px' : 0,
              marginTop: item.direction === 'vertical' ? '2px' : 0,
            }}
          />
        </div>
      ))}
    </div>
  )
}
