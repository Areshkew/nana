// Original: Tests/MuxyTests/TabAreaTests.swift
// Description: Unit tests for TabArea pure functions.

import { describe, it, expect } from 'vitest'
import {
  createTabArea,
  createTabInArea,
  closeTab,
  selectTab,
  selectNextTab,
  selectPreviousTab,
  reorderTab,
  togglePin,
  setCustomTitle,
  setTabColorID,
  createTabAdjacent,
  getActiveTab,
} from '../tabArea'

describe('TabArea', () => {
  it('creates with one terminal tab', () => {
    const area = createTabArea('/project')
    expect(area.tabs.length).toBe(1)
    expect(area.activeTabID).toBe(area.tabs[0].id)
  })

  it('creates a new tab and makes it active', () => {
    const area = createTabArea('/project')
    const updated = createTabInArea(area)
    expect(updated.tabs.length).toBe(2)
    expect(updated.activeTabID).toBe(updated.tabs[1].id)
  })

  it('selects a tab', () => {
    const area = createTabArea('/project')
    const area2 = createTabInArea(area)
    const firstTab = area2.tabs[0]
    const updated = selectTab(area2, firstTab.id)
    expect(updated.activeTabID).toBe(firstTab.id)
  })

  it('selectNextTab cycles forward', () => {
    const area = createTabArea('/project')
    const area2 = createTabInArea(area)
    const first = area2.tabs[0].id
    const updated = selectNextTab(selectTab(area2, first))
    expect(updated.activeTabID).toBe(area2.tabs[1].id)
  })

  it('selectPreviousTab cycles backward', () => {
    const area = createTabArea('/project')
    const area2 = createTabInArea(area)
    const updated = selectPreviousTab(area2)
    expect(updated.activeTabID).toBe(area2.tabs[0].id)
  })

  it('closes a tab and falls back to history', () => {
    const area = createTabArea('/project')
    const area2 = createTabInArea(area)
    const firstTab = area2.tabs[0]
    const area3 = selectTab(area2, firstTab.id)
    const closed = closeTab(area3, area3.tabs[1].id)
    expect(closed.area.tabs.length).toBe(1)
    expect(closed.area.activeTabID).toBe(firstTab.id)
  })

  it('closes pinned tab', () => {
    const area = createTabArea('/project')
    const pinned = { ...area.tabs[0], isPinned: true }
    const areaPinned = { ...area, tabs: [pinned] }
    const closed = closeTab(areaPinned, pinned.id)
    expect(closed.area.tabs.length).toBe(0)
  })

  it('reorders tabs', () => {
    const area = createTabArea('/project')
    const area2 = createTabInArea(area)
    const area3 = createTabInArea(area2)
    const reordered = reorderTab(area3, 0, 3)
    expect(reordered.tabs[2].id).toBe(area3.tabs[0].id)
  })

  it('toggles pin in place', () => {
    const area = createTabArea('/project')
    const area2 = createTabInArea(area)
    const area3 = createTabInArea(area2)
    const lastTab = area3.tabs[area3.tabs.length - 1]
    const lastIndex = area3.tabs.length - 1
    const pinned = togglePin(area3, lastTab.id)
    expect(pinned.tabs[lastIndex].isPinned).toBe(true)
    expect(pinned.tabs[lastIndex].id).toBe(lastTab.id)
  })

  it('sets custom title', () => {
    const area = createTabArea('/project')
    const updated = setCustomTitle(area, area.tabs[0].id, 'My Tab')
    expect(updated.tabs[0].customTitle).toBe('My Tab')
  })

  it('sets color id', () => {
    const area = createTabArea('/project')
    const updated = setTabColorID(area, area.tabs[0].id, 'red')
    expect(updated.tabs[0].colorID).toBe('red')
  })

  it('creates tab adjacent', () => {
    const area = createTabArea('/project')
    const area2 = createTabInArea(area)
    const firstTab = area2.tabs[0]
    const updated = createTabAdjacent(area2, firstTab.id, 'right')
    expect(updated.tabs.length).toBe(3)
    expect(updated.tabs[1].content.kind).toBe('terminal')
  })

  it('getActiveTab returns the active tab', () => {
    const area = createTabArea('/project')
    expect(getActiveTab(area)?.id).toBe(area.tabs[0].id)
  })
})
