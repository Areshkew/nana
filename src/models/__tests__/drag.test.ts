// Original: Tests/MuxyTests/TabDragCoordinatorTests.swift
// Description: Unit tests for drag model pure functions.

import { describe, it, expect } from 'vitest'
import { dropResultToMoveRequest, type DropResult, type DragInfo } from '../drag'

describe('dropResultToMoveRequest', () => {
  const drag: DragInfo = {
    tabID: 'tab-1',
    sourceAreaID: 'area-a',
    projectID: 'proj-1',
  }

  it('converts center zone to toArea move', () => {
    const result: DropResult = {
      drag,
      zone: 'center',
      targetAreaID: 'area-b',
    }
    const request = dropResultToMoveRequest(result)
    expect(request).toEqual({
      type: 'toArea',
      tabID: 'tab-1',
      sourceAreaID: 'area-a',
      destinationAreaID: 'area-b',
    })
  })

  it('converts left zone to horizontal first split', () => {
    const result: DropResult = {
      drag,
      zone: 'left',
      targetAreaID: 'area-b',
    }
    const request = dropResultToMoveRequest(result)
    expect(request).toEqual({
      type: 'toNewSplit',
      tabID: 'tab-1',
      sourceAreaID: 'area-a',
      targetAreaID: 'area-b',
      split: { direction: 'horizontal', position: 'first' },
    })
  })

  it('converts right zone to horizontal second split', () => {
    const result: DropResult = {
      drag,
      zone: 'right',
      targetAreaID: 'area-b',
    }
    const request = dropResultToMoveRequest(result)
    expect(request).toEqual({
      type: 'toNewSplit',
      tabID: 'tab-1',
      sourceAreaID: 'area-a',
      targetAreaID: 'area-b',
      split: { direction: 'horizontal', position: 'second' },
    })
  })

  it('converts top zone to vertical first split', () => {
    const result: DropResult = {
      drag,
      zone: 'top',
      targetAreaID: 'area-b',
    }
    const request = dropResultToMoveRequest(result)
    expect(request).toEqual({
      type: 'toNewSplit',
      tabID: 'tab-1',
      sourceAreaID: 'area-a',
      targetAreaID: 'area-b',
      split: { direction: 'vertical', position: 'first' },
    })
  })

  it('converts bottom zone to vertical second split', () => {
    const result: DropResult = {
      drag,
      zone: 'bottom',
      targetAreaID: 'area-b',
    }
    const request = dropResultToMoveRequest(result)
    expect(request).toEqual({
      type: 'toNewSplit',
      tabID: 'tab-1',
      sourceAreaID: 'area-a',
      targetAreaID: 'area-b',
      split: { direction: 'vertical', position: 'second' },
    })
  })
})
