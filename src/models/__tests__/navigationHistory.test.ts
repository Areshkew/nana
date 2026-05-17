// Original: Tests/MuxyTests/Models/NavigationHistoryTests.swift
// Description: Tests for NavigationHistory — recording, dedup, truncation, suppression, pruning.
// Status: Completed

import { describe, it, expect } from 'vitest'
import { NavigationHistory, type NavigationEntry } from '../navigationHistory'

function makeEntry(tab = 0): NavigationEntry {
  return {
    projectID: crypto.randomUUID(),
    worktreeID: crypto.randomUUID(),
    areaID: crypto.randomUUID(),
    tabID: tab === 0 ? null : crypto.randomUUID(),
  }
}

describe('NavigationHistory', () => {
  it('starts empty with cursor at -1', () => {
    const history = new NavigationHistory()
    expect(history.entries).toHaveLength(0)
    expect(history.cursor).toBe(-1)
    expect(history.current).toBeUndefined()
    expect(history.canGoBack).toBe(false)
    expect(history.canGoForward).toBe(false)
  })

  it('record appends and advances cursor', () => {
    const history = new NavigationHistory()
    const a = makeEntry(1)
    const b = makeEntry(2)
    history.record(a)
    history.record(b)
    expect(history.entries).toEqual([a, b])
    expect(history.cursor).toBe(1)
    expect(history.current).toBe(b)
    expect(history.canGoBack).toBe(true)
    expect(history.canGoForward).toBe(false)
  })

  it('record dedupes consecutive duplicates', () => {
    const history = new NavigationHistory()
    const a = makeEntry(1)
    history.record(a)
    history.record(a)
    history.record(a)
    expect(history.entries).toHaveLength(1)
    expect(history.cursor).toBe(0)
  })

  it('record truncates forward entries when cursor is not at end', () => {
    const history = new NavigationHistory()
    const a = makeEntry(1)
    const b = makeEntry(2)
    const c = makeEntry(3)
    const d = makeEntry(4)
    history.record(a)
    history.record(b)
    history.record(c)
    history.setCursor(0)
    history.record(d)
    expect(history.entries).toEqual([a, d])
    expect(history.cursor).toBe(1)
  })

  it('record enforces maxSize by dropping oldest and adjusting cursor', () => {
    const history = new NavigationHistory()
    const recorded: NavigationEntry[] = []
    for (let i = 1; i <= 105; i++) {
      const entry = makeEntry(i)
      recorded.push(entry)
      history.record(entry)
    }
    expect(history.entries).toHaveLength(100)
    expect(history.entries[0]).toBe(recorded[5])
    expect(history.entries[99]).toBe(recorded[104])
    expect(history.cursor).toBe(99)
  })

  it('performWithRecordingSuppressed blocks record inside closure', () => {
    const history = new NavigationHistory()
    const a = makeEntry(1)
    const b = makeEntry(2)
    history.record(a)
    history.performWithRecordingSuppressed(() => {
      history.record(b)
    })
    expect(history.entries).toEqual([a])
    history.record(b)
    expect(history.entries).toEqual([a, b])
  })

  it('performWithRecordingSuppressed restores previous state when nested', () => {
    const history = new NavigationHistory()
    const a = makeEntry(1)
    const b = makeEntry(2)
    history.performWithRecordingSuppressed(() => {
      history.performWithRecordingSuppressed(() => {
        history.record(a)
      })
      history.record(b)
    })
    expect(history.entries).toHaveLength(0)
  })

  it('removeEntry shifts cursor when removing earlier index', () => {
    const history = new NavigationHistory()
    const a = makeEntry(1)
    const b = makeEntry(2)
    const c = makeEntry(3)
    history.record(a)
    history.record(b)
    history.record(c)
    history.removeEntry(0)
    expect(history.entries).toEqual([b, c])
    expect(history.cursor).toBe(1)
  })

  it('removeEntry clamps cursor when removing cursor at end', () => {
    const history = new NavigationHistory()
    const a = makeEntry(1)
    const b = makeEntry(2)
    history.record(a)
    history.record(b)
    history.removeEntry(1)
    expect(history.entries).toEqual([a])
    expect(history.cursor).toBe(0)
  })

  it('removeEntries preserves cursor when current survives', () => {
    const history = new NavigationHistory()
    const entries = [1, 2, 3, 4, 5].map((n) => makeEntry(n))
    for (const e of entries) history.record(e)
    history.setCursor(2)
    history.removeEntries((e) => e === entries[4])
    expect(history.entries).toEqual([entries[0], entries[1], entries[2], entries[3]])
    expect(history.current).toBe(entries[2])
    expect(history.cursor).toBe(2)
  })

  it('removeEntries shifts cursor when earlier entries are removed', () => {
    const history = new NavigationHistory()
    const entries = [1, 2, 3, 4, 5].map((n) => makeEntry(n))
    for (const e of entries) history.record(e)
    history.setCursor(3)
    history.removeEntries((e) => e === entries[0] || e === entries[1])
    expect(history.entries).toEqual([entries[2], entries[3], entries[4]])
    expect(history.current).toBe(entries[3])
    expect(history.cursor).toBe(1)
  })

  it('removeEntries falls back to entry before cursor when current is removed', () => {
    const history = new NavigationHistory()
    const entries = [1, 2, 3, 4].map((n) => makeEntry(n))
    for (const e of entries) history.record(e)
    history.setCursor(1)
    history.removeEntries((e) => e === entries[1])
    expect(history.entries).toEqual([entries[0], entries[2], entries[3]])
    expect(history.current).toBe(entries[0])
    expect(history.cursor).toBe(0)
  })

  it('removeEntries falls back to first kept entry when cursor was at front and removed', () => {
    const history = new NavigationHistory()
    const entries = [1, 2, 3].map((n) => makeEntry(n))
    for (const e of entries) history.record(e)
    history.setCursor(0)
    history.removeEntries((e) => e === entries[0])
    expect(history.entries).toEqual([entries[1], entries[2]])
    expect(history.cursor).toBe(0)
  })

  it('removeEntries handles clearing everything', () => {
    const history = new NavigationHistory()
    const entries = [1, 2, 3].map((n) => makeEntry(n))
    for (const e of entries) history.record(e)
    history.removeEntries(() => true)
    expect(history.entries).toHaveLength(0)
    expect(history.cursor).toBe(-1)
  })

  it('setCursor rejects out-of-range indices', () => {
    const history = new NavigationHistory()
    const a = makeEntry(1)
    const b = makeEntry(2)
    history.record(a)
    history.record(b)
    history.setCursor(-1)
    expect(history.cursor).toBe(1)
    history.setCursor(5)
    expect(history.cursor).toBe(1)
    history.setCursor(0)
    expect(history.cursor).toBe(0)
  })
})
