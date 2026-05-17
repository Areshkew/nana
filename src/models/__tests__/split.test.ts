// Original: Tests/MuxyTests/SplitNodeTests.swift
// Description: Unit tests for SplitNode pure functions.

import { describe, it, expect } from 'vitest'
import {
  createTabArea,
} from '../tabArea'
import {
  type SplitNode,
  splitting,
  splittingWithTab,
  removing,
  containsArea,
  allAreas,
  findArea,
  areaFrames,
  replaceArea,
  layoutItems,
  updateBranchRatio,
} from '../split'
import { createTerminalTab } from '../tab'

function makeLeaf(path = '/project'): SplitNode {
  return { type: 'tabArea', area: createTabArea(path) }
}

describe('SplitNode', () => {
  it('splitting a leaf creates a branch', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    const result = splitting(leaf, areaID, 'horizontal', 'first')
    expect(result.node.type).toBe('split')
    expect(result.newAreaID).toBeDefined()
    const branch = result.node.type === 'split' ? result.node.branch : null
    expect(branch).not.toBeNull()
    expect(branch!.direction).toBe('horizontal')
    expect(branch!.first.type).toBe('tabArea')
    expect(branch!.second.type).toBe('tabArea')
  })

  it('splitting with tab places tab in new area', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    const tab = createTerminalTab('/project')
    const result = splittingWithTab(leaf, areaID, 'vertical', 'second', tab)
    expect(result.node.type).toBe('split')
    const branch = result.node.type === 'split' ? result.node.branch : null
    expect(branch!.second.type).toBe('tabArea')
    expect(branch!.second.type === 'tabArea' ? branch!.second.area.tabs.length : 0).toBe(1)
  })

  it('removing a leaf returns null', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    expect(removing(leaf, areaID)).toBeNull()
  })

  it('removing one side of a split collapses to the other side', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    const splitResult = splitting(leaf, areaID, 'horizontal', 'first')
    const branch = splitResult.node.type === 'split' ? splitResult.node.branch : null
    expect(branch).not.toBeNull()
    const newAreaID = splitResult.newAreaID!
    const removed = removing(splitResult.node, newAreaID)
    expect(removed).not.toBeNull()
    expect(removed!.type).toBe('tabArea')
  })

  it('removes area from second branch of a split', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    const splitResult = splitting(leaf, areaID, 'horizontal', 'first')
    const branch = splitResult.node.type === 'split' ? splitResult.node.branch : null
    expect(branch).not.toBeNull()
    const newAreaID = splitResult.newAreaID!
    // newArea is in the second branch when position='first'
    const removed = removing(splitResult.node, newAreaID)
    expect(removed).not.toBeNull()
    expect(removed!.type).toBe('tabArea')
    // The remaining area should be the original one
    if (removed!.type === 'tabArea') {
      expect(removed!.area.id).toBe(areaID)
    }
  })

  it('containsArea finds nested area', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    const splitResult = splitting(leaf, areaID, 'horizontal', 'first')
    const branch = splitResult.node.type === 'split' ? splitResult.node.branch : null
    expect(branch).not.toBeNull()
    expect(containsArea(splitResult.node, areaID)).toBe(true)
    expect(containsArea(splitResult.node, splitResult.newAreaID!)).toBe(true)
    expect(containsArea(splitResult.node, 'nonexistent')).toBe(false)
  })

  it('allAreas returns all leaves', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    const splitResult = splitting(leaf, areaID, 'vertical', 'second')
    const areas = allAreas(splitResult.node)
    expect(areas.length).toBe(2)
  })

  it('findArea returns correct area', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    expect(findArea(leaf, areaID)?.id).toBe(areaID)
    expect(findArea(leaf, 'missing')).toBeUndefined()
  })

  it('areaFrames assigns rects', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    const splitResult = splitting(leaf, areaID, 'horizontal', 'first')
    const frames = areaFrames(splitResult.node, { x: 0, y: 0, width: 100, height: 100 })
    expect(frames.size).toBe(2)
    const vals = Array.from(frames.values())
    expect(vals[0].width + vals[1].width).toBeCloseTo(100)
  })

  it('replaceArea updates nested leaf', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    const newArea = createTabArea('/other')
    const replaced = replaceArea(leaf, areaID, newArea)
    expect(replaced.type === 'tabArea' ? replaced.area.id : '').toBe(newArea.id)
  })

  it('layoutItems returns areas and dividers', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    const splitResult = splitting(leaf, areaID, 'horizontal', 'first')
    const items = layoutItems(splitResult.node, { x: 0, y: 0, width: 100, height: 100 })
    const areas = items.filter((i) => i.type === 'area')
    const dividers = items.filter((i) => i.type === 'divider')
    expect(areas.length).toBe(2)
    expect(dividers.length).toBe(1)
    expect(dividers[0]?.direction).toBe('horizontal')
  })

  it('updateBranchRatio updates nested branch', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    const splitResult = splitting(leaf, areaID, 'horizontal', 'first')
    const branch = splitResult.node.type === 'split' ? splitResult.node.branch : null
    expect(branch).not.toBeNull()
    const updated = updateBranchRatio(splitResult.node, branch!.id, 0.7)
    const updatedBranch = updated.type === 'split' ? updated.branch : null
    expect(updatedBranch?.ratio).toBe(0.7)
  })

  it('updateBranchRatio clamps ratio', () => {
    const leaf = makeLeaf()
    const areaID = leaf.type === 'tabArea' ? leaf.area.id : ''
    const splitResult = splitting(leaf, areaID, 'horizontal', 'first')
    const branch = splitResult.node.type === 'split' ? splitResult.node.branch : null
    expect(branch).not.toBeNull()
    const updated = updateBranchRatio(splitResult.node, branch!.id, 0.05)
    const updatedBranch = updated.type === 'split' ? updated.branch : null
    expect(updatedBranch?.ratio).toBe(0.15)
  })
})
