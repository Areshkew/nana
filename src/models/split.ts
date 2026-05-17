// Original: Muxy/Models/SplitNode.swift
// Description: Recursive binary tree for pane splits with immutable operations.
// Status: ✅ Completed

import { type TabArea, createTabArea, createTabAreaWithTab } from './tabArea'
import { type TerminalTab } from './tab'

export type SplitDirection = 'horizontal' | 'vertical'
export type SplitPosition = 'first' | 'second'

export type SplitNode =
  | { type: 'tabArea'; area: TabArea }
  | { type: 'split'; branch: SplitBranch }

export interface SplitBranch {
  id: string
  direction: SplitDirection
  ratio: number
  first: SplitNode
  second: SplitNode
}

export function createSplitBranch(
  direction: SplitDirection,
  first: SplitNode,
  second: SplitNode,
  ratio = 0.5,
): SplitBranch {
  return {
    id: crypto.randomUUID(),
    direction,
    ratio,
    first,
    second,
  }
}

export function getNodeID(node: SplitNode): string {
  switch (node.type) {
    case 'tabArea': return node.area.id
    case 'split': return node.branch.id
  }
}

export function splitting(
  node: SplitNode,
  areaID: string,
  direction: SplitDirection,
  position: SplitPosition,
): { node: SplitNode; newAreaID?: string } {
  switch (node.type) {
    case 'tabArea': {
      if (node.area.id !== areaID) return { node }
      const newArea = createTabArea(node.area.projectPath)
      const firstNode: SplitNode =
        position === 'first'
          ? { type: 'tabArea', area: newArea }
          : { type: 'tabArea', area: node.area }
      const secondNode: SplitNode =
        position === 'first'
          ? { type: 'tabArea', area: node.area }
          : { type: 'tabArea', area: newArea }
      return {
        node: {
          type: 'split',
          branch: createSplitBranch(direction, firstNode, secondNode),
        },
        newAreaID: newArea.id,
      }
    }
    case 'split': {
      const firstResult = splitting(node.branch.first, areaID, direction, position)
      if (firstResult.newAreaID) {
        return {
          node: {
            type: 'split',
            branch: { ...node.branch, first: firstResult.node },
          },
          newAreaID: firstResult.newAreaID,
        }
      }
      const secondResult = splitting(node.branch.second, areaID, direction, position)
      if (secondResult.newAreaID) {
        return {
          node: {
            type: 'split',
            branch: { ...node.branch, second: secondResult.node },
          },
          newAreaID: secondResult.newAreaID,
        }
      }
      return { node }
    }
  }
}

export function splittingWithTab(
  node: SplitNode,
  areaID: string,
  direction: SplitDirection,
  position: SplitPosition,
  tab: TerminalTab,
): { node: SplitNode; newAreaID?: string } {
  switch (node.type) {
    case 'tabArea': {
      if (node.area.id !== areaID) return { node }
      const newArea = createTabAreaWithTab(node.area.projectPath, tab)
      const firstNode: SplitNode =
        position === 'first'
          ? { type: 'tabArea', area: newArea }
          : { type: 'tabArea', area: node.area }
      const secondNode: SplitNode =
        position === 'first'
          ? { type: 'tabArea', area: node.area }
          : { type: 'tabArea', area: newArea }
      return {
        node: {
          type: 'split',
          branch: createSplitBranch(direction, firstNode, secondNode),
        },
        newAreaID: newArea.id,
      }
    }
    case 'split': {
      const firstResult = splittingWithTab(node.branch.first, areaID, direction, position, tab)
      if (firstResult.newAreaID) {
        return {
          node: {
            type: 'split',
            branch: { ...node.branch, first: firstResult.node },
          },
          newAreaID: firstResult.newAreaID,
        }
      }
      const secondResult = splittingWithTab(
        node.branch.second,
        areaID,
        direction,
        position,
        tab,
      )
      if (secondResult.newAreaID) {
        return {
          node: {
            type: 'split',
            branch: { ...node.branch, second: secondResult.node },
          },
          newAreaID: secondResult.newAreaID,
        }
      }
      return { node }
    }
  }
}

export function removing(node: SplitNode, areaID: string): SplitNode | null {
  switch (node.type) {
    case 'tabArea': {
      if (node.area.id === areaID) return null
      return node
    }
    case 'split': {
      if (
        node.branch.first.type === 'tabArea' &&
        node.branch.first.area.id === areaID
      ) {
        return node.branch.second
      }
      if (
        node.branch.second.type === 'tabArea' &&
        node.branch.second.area.id === areaID
      ) {
        return node.branch.first
      }
      if (containsArea(node.branch.first, areaID)) {
        const newFirst = removing(node.branch.first, areaID)
        if (newFirst !== null) {
          return {
            type: 'split',
            branch: { ...node.branch, first: newFirst },
          }
        }
      }
      if (containsArea(node.branch.second, areaID)) {
        const newSecond = removing(node.branch.second, areaID)
        if (newSecond !== null) {
          return {
            type: 'split',
            branch: { ...node.branch, second: newSecond },
          }
        }
      }
      return node
    }
  }
}

export function containsArea(node: SplitNode, id: string): boolean {
  switch (node.type) {
    case 'tabArea': return node.area.id === id
    case 'split':
      return containsArea(node.branch.first, id) || containsArea(node.branch.second, id)
  }
}

export function allAreas(node: SplitNode): TabArea[] {
  switch (node.type) {
    case 'tabArea': return [node.area]
    case 'split':
      return [...allAreas(node.branch.first), ...allAreas(node.branch.second)]
  }
}

export function findArea(node: SplitNode, id: string): TabArea | undefined {
  switch (node.type) {
    case 'tabArea': return node.area.id === id ? node.area : undefined
    case 'split':
      return findArea(node.branch.first, id) ?? findArea(node.branch.second, id)
  }
}

export interface AreaFrame {
  x: number
  y: number
  width: number
  height: number
}

export function areaFrames(
  node: SplitNode,
  rect: AreaFrame = { x: 0, y: 0, width: 1, height: 1 },
): Map<string, AreaFrame> {
  const result = new Map<string, AreaFrame>()
  switch (node.type) {
    case 'tabArea': {
      result.set(node.area.id, rect)
      break
    }
    case 'split': {
      const ratio = Math.min(Math.max(node.branch.ratio, 0), 1)
      if (node.branch.direction === 'horizontal') {
        const firstWidth = rect.width * ratio
        const firstRect: AreaFrame = {
          x: rect.x,
          y: rect.y,
          width: firstWidth,
          height: rect.height,
        }
        const secondRect: AreaFrame = {
          x: rect.x + firstWidth,
          y: rect.y,
          width: rect.width - firstWidth,
          height: rect.height,
        }
        areaFrames(node.branch.first, firstRect).forEach((v, k) => result.set(k, v))
        areaFrames(node.branch.second, secondRect).forEach((v, k) => result.set(k, v))
      } else {
        const firstHeight = rect.height * ratio
        const firstRect: AreaFrame = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: firstHeight,
        }
        const secondRect: AreaFrame = {
          x: rect.x,
          y: rect.y + firstHeight,
          width: rect.width,
          height: rect.height - firstHeight,
        }
        areaFrames(node.branch.first, firstRect).forEach((v, k) => result.set(k, v))
        areaFrames(node.branch.second, secondRect).forEach((v, k) => result.set(k, v))
      }
      break
    }
  }
  return result
}

export function replaceArea(node: SplitNode, areaID: string, newArea: TabArea): SplitNode {
  switch (node.type) {
    case 'tabArea':
      if (node.area.id === areaID) return { type: 'tabArea', area: newArea }
      return node
    case 'split':
      return {
        type: 'split',
        branch: {
          ...node.branch,
          first: replaceArea(node.branch.first, areaID, newArea),
          second: replaceArea(node.branch.second, areaID, newArea),
        },
      }
  }
}

export interface LayoutItem {
  type: 'area' | 'divider'
  id: string
  direction?: SplitDirection
  ratio?: number
  frame: AreaFrame
}

export function layoutItems(
  node: SplitNode,
  rect: AreaFrame = { x: 0, y: 0, width: 1, height: 1 },
): LayoutItem[] {
  const result: LayoutItem[] = []
  switch (node.type) {
    case 'tabArea': {
      result.push({ type: 'area', id: node.area.id, frame: rect })
      break
    }
    case 'split': {
      const ratio = Math.min(Math.max(node.branch.ratio, 0), 1)
      if (node.branch.direction === 'horizontal') {
        const firstWidth = rect.width * ratio
        const firstRect: AreaFrame = {
          x: rect.x,
          y: rect.y,
          width: firstWidth,
          height: rect.height,
        }
        const secondRect: AreaFrame = {
          x: rect.x + firstWidth,
          y: rect.y,
          width: rect.width - firstWidth,
          height: rect.height,
        }
        result.push(...layoutItems(node.branch.first, firstRect))
        result.push({
          type: 'divider',
          id: node.branch.id,
          direction: 'horizontal',
          ratio,
          frame: { x: rect.x + firstWidth, y: rect.y, width: 0, height: rect.height },
        })
        result.push(...layoutItems(node.branch.second, secondRect))
      } else {
        const firstHeight = rect.height * ratio
        const firstRect: AreaFrame = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: firstHeight,
        }
        const secondRect: AreaFrame = {
          x: rect.x,
          y: rect.y + firstHeight,
          width: rect.width,
          height: rect.height - firstHeight,
        }
        result.push(...layoutItems(node.branch.first, firstRect))
        result.push({
          type: 'divider',
          id: node.branch.id,
          direction: 'vertical',
          ratio,
          frame: { x: rect.x, y: rect.y + firstHeight, width: rect.width, height: 0 },
        })
        result.push(...layoutItems(node.branch.second, secondRect))
      }
      break
    }
  }
  return result
}

export function updateBranchRatio(
  node: SplitNode,
  branchID: string,
  ratio: number,
): SplitNode {
  switch (node.type) {
    case 'tabArea':
      return node
    case 'split': {
      if (node.branch.id === branchID) {
        return {
          type: 'split',
          branch: { ...node.branch, ratio: Math.min(Math.max(ratio, 0.15), 0.85) },
        }
      }
      return {
        type: 'split',
        branch: {
          ...node.branch,
          first: updateBranchRatio(node.branch.first, branchID, ratio),
          second: updateBranchRatio(node.branch.second, branchID, ratio),
        },
      }
    }
  }
}
