// Original: Muxy/Models/NavigationHistory.swift
// Description: Stack-based navigation history with recording, back/forward, dedup, and dead-entry pruning.
// Status: Completed

export interface NavigationEntry {
  projectID: string
  worktreeID: string
  areaID: string
  tabID: string | null
}

const MAX_SIZE = 100

function entriesEqual(a: NavigationEntry, b: NavigationEntry): boolean {
  return a.projectID === b.projectID &&
    a.worktreeID === b.worktreeID &&
    a.areaID === b.areaID &&
    a.tabID === b.tabID
}

export class NavigationHistory {
  private _entries: NavigationEntry[] = []
  private _cursor = -1
  private _suppressDepth = 0

  get entries(): readonly NavigationEntry[] { return this._entries }
  get cursor(): number { return this._cursor }
  get canGoBack(): boolean { return this._cursor > 0 }
  get canGoForward(): boolean { return this._cursor >= 0 && this._cursor < this._entries.length - 1 }
  get current(): NavigationEntry | undefined {
    if (this._cursor < 0 || this._cursor >= this._entries.length) return undefined
    return this._entries[this._cursor]
  }

  record(entry: NavigationEntry): void {
    if (this._suppressDepth > 0) return
    const cur = this.current
    if (cur && entriesEqual(cur, entry)) return
    if (this._cursor < this._entries.length - 1) {
      this._entries.splice(this._cursor + 1)
    }
    this._entries.push(entry)
    this._cursor = this._entries.length - 1
    if (this._entries.length > MAX_SIZE) {
      const overflow = this._entries.length - MAX_SIZE
      this._entries.splice(0, overflow)
      this._cursor -= overflow
    }
  }

  setCursor(index: number): void {
    if (index < 0 || index >= this._entries.length) return
    this._cursor = index
  }

  removeEntry(at: number): void {
    if (at < 0 || at >= this._entries.length) return
    this._entries.splice(at, 1)
    if (this._cursor > at) {
      this._cursor -= 1
    } else if (this._cursor >= this._entries.length) {
      this._cursor = this._entries.length - 1
    }
  }

  removeEntries(predicate: (entry: NavigationEntry) => boolean): void {
    const prevCursor = this._cursor
    const kept: NavigationEntry[] = []
    let cursorAtOrBefore = -1
    for (let i = 0; i < this._entries.length; i++) {
      const entry = this._entries[i]
      if (predicate(entry)) continue
      kept.push(entry)
      if (i <= prevCursor) {
        cursorAtOrBefore = kept.length - 1
      }
    }
    this._entries = kept
    this._cursor = kept.length === 0 ? -1 : Math.max(0, cursorAtOrBefore)
  }

  performWithRecordingSuppressed<T>(body: () => T): T {
    this._suppressDepth++
    try {
      return body()
    } finally {
      this._suppressDepth--
    }
  }
}
