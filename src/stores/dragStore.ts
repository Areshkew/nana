// Original: Muxy/Models/TabDragCoordinator.swift
// Description: Drag coordination state and drop zone computation.
// Status: ✅ Completed

import { create } from 'zustand'
import { type DropZone, type DragInfo, type DropResult } from '../models/drag'
import { type AreaFrame } from '../models/split'

interface HoverMatch {
  areaID: string
  frame: AreaFrame
  metric: number
}

interface DragState {
  activeDrag: DragInfo | null
  globalPosition: { x: number; y: number }
  areaFramesByProject: Record<string, Map<string, AreaFrame>>
  hoveredAreaID: string | null
  hoveredZone: DropZone | null

  setAreaFrames: (projectID: string, frames: Map<string, AreaFrame>) => void
  beginDrag: (tabID: string, sourceAreaID: string, projectID: string) => void
  updatePosition: (x: number, y: number) => void
  endDrag: () => DropResult | null
  cancelDrag: () => void
  computeHover: () => void
}

export const useDragStore = create<DragState>((set, get) => ({
  activeDrag: null,
  globalPosition: { x: 0, y: 0 },
  areaFramesByProject: {},
  hoveredAreaID: null,
  hoveredZone: null,

  setAreaFrames: (projectID: string, frames: Map<string, AreaFrame>) => {
    set((state) => {
      const existing = state.areaFramesByProject[projectID]
      if (
        existing?.size === frames.size &&
        Array.from(frames.entries()).every(
          ([k, v]) =>
            existing.has(k) &&
            existing.get(k)!.x === v.x &&
            existing.get(k)!.y === v.y &&
            existing.get(k)!.width === v.width &&
            existing.get(k)!.height === v.height,
        )
      ) {
        return state
      }
      return {
        ...state,
        areaFramesByProject: { ...state.areaFramesByProject, [projectID]: frames },
      }
    })
    get().computeHover()
  },

  beginDrag: (tabID: string, sourceAreaID: string, projectID: string) => {
    set({
      activeDrag: { tabID, sourceAreaID, projectID },
      hoveredAreaID: null,
      hoveredZone: null,
    })
  },

  updatePosition: (x: number, y: number) => {
    set({ globalPosition: { x, y } })
    get().computeHover()
  },

  endDrag: () => {
    const { activeDrag, hoveredAreaID, hoveredZone } = get()
    if (!activeDrag || !hoveredAreaID || !hoveredZone) {
      get().cancelDrag()
      return null
    }
    const result: DropResult = {
      drag: activeDrag,
      zone: hoveredZone,
      targetAreaID: hoveredAreaID,
    }
    get().cancelDrag()
    return result
  },

  cancelDrag: () => {
    set({
      activeDrag: null,
      globalPosition: { x: 0, y: 0 },
      hoveredAreaID: null,
      hoveredZone: null,
    })
  },

  computeHover: () => {
    const { activeDrag, globalPosition, areaFramesByProject } = get()
    if (!activeDrag) return
    const frames = areaFramesByProject[activeDrag.projectID]
    if (!frames) {
      set({ hoveredAreaID: null, hoveredZone: null })
      return
    }

    let containingMatch: HoverMatch | undefined
    frames.forEach((frame, areaID) => {
      if (!pointInRect(globalPosition, frame)) return
      const dx = globalPosition.x - (frame.x + frame.width / 2)
      const dy = globalPosition.y - (frame.y + frame.height / 2)
      const distanceToCenter = dx * dx + dy * dy
      if (containingMatch && containingMatch.metric <= distanceToCenter) return
      containingMatch = { areaID, frame, metric: distanceToCenter }
    })

    if (containingMatch) {
      const zone = zoneForPoint(globalPosition, containingMatch.frame)
      set({ hoveredAreaID: containingMatch.areaID, hoveredZone: zone })
      return
    }

    const snapTolerance = 8
    let nearestMatch: HoverMatch | undefined
    frames.forEach((frame, areaID) => {
      const distance = distanceFromPointToRect(globalPosition, frame)
      if (distance > snapTolerance) return
      if (nearestMatch && nearestMatch.metric <= distance) return
      nearestMatch = { areaID, frame, metric: distance }
    })

    if (nearestMatch) {
      const clamped = clampPointToRect(globalPosition, nearestMatch.frame)
      const zone = zoneForPoint(clamped, nearestMatch.frame)
      set({ hoveredAreaID: nearestMatch.areaID, hoveredZone: zone })
      return
    }

    set({ hoveredAreaID: null, hoveredZone: null })
  },
}))

function pointInRect(point: { x: number; y: number }, rect: AreaFrame): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

function distanceFromPointToRect(point: { x: number; y: number }, rect: AreaFrame): number {
  const dx = Math.max(rect.x - point.x, Math.max(0, point.x - (rect.x + rect.width)))
  const dy = Math.max(rect.y - point.y, Math.max(0, point.y - (rect.y + rect.height)))
  return Math.hypot(dx, dy)
}

function clampPointToRect(
  point: { x: number; y: number },
  rect: AreaFrame,
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(point.x, rect.x), rect.x + rect.width),
    y: Math.min(Math.max(point.y, rect.y), rect.y + rect.height),
  }
}

function zoneForPoint(point: { x: number; y: number }, rect: AreaFrame): DropZone {
  if (rect.width <= 0 || rect.height <= 0) return 'center'
  const relX = (point.x - rect.x) / rect.width
  const relY = (point.y - rect.y) / rect.height
  const edgeThreshold = 0.3
  if (relX < edgeThreshold) return 'left'
  if (relX > 1 - edgeThreshold) return 'right'
  if (relY < edgeThreshold) return 'top'
  if (relY > 1 - edgeThreshold) return 'bottom'
  return 'center'
}
