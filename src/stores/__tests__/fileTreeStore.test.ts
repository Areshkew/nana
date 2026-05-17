// Original: Muxy/Models/FileTreeState.swift
// Description: Unit tests for the file tree Zustand store (pure state transitions).
// Status: ✅ Completed

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFileTreeStore, PendingEntryKind } from '../fileTreeStore'
import type { FileTreeEntry } from '../fileTreeStore'
import type { FileStatus } from '../../services/virtualization/treeFlattener'

const MOCK_ROOT = '/repo'

function dir(name: string, absPath: string): FileTreeEntry {
  return { name, absolutePath: absPath, relativePath: name, isDirectory: true, isIgnored: false }
}

function file(name: string, absPath: string): FileTreeEntry {
  return { name, absolutePath: absPath, relativePath: name, isDirectory: false, isIgnored: false }
}

const MOCK_ROOT_ENTRIES: FileTreeEntry[] = [
  dir('src', '/repo/src'),
  dir('tests', '/repo/tests'),
  file('readme.md', '/repo/readme.md'),
]

const MOCK_SRC_CHILDREN: FileTreeEntry[] = [
  dir('components', '/repo/src/components'),
  file('index.ts', '/repo/src/index.ts'),
]

const MOCK_STATUS_RAW: Record<string, string> = {
  'src/index.ts': 'modified',
  'readme.md': 'added',
}

function createMockAPI() {
  return {
    fileTreeReadDirectory: vi.fn().mockImplementation((_dirPath: string, _repoRoot: string) => {
      if (_dirPath === MOCK_ROOT) return Promise.resolve(MOCK_ROOT_ENTRIES)
      if (_dirPath === '/repo/src') return Promise.resolve(MOCK_SRC_CHILDREN)
      return Promise.resolve([])
    }),
    fileTreeGitStatusPaths: vi.fn().mockResolvedValue(MOCK_STATUS_RAW),
    gitWatchStart: vi.fn().mockResolvedValue(undefined),
    gitWatchStop: vi.fn().mockResolvedValue(undefined),
    onGitDirectoryChanged: vi.fn().mockReturnValue(() => undefined),
  }
}

let mockAPI: ReturnType<typeof createMockAPI>

beforeEach(() => {
  mockAPI = createMockAPI()
  globalThis.window = { electronAPI: mockAPI } as unknown as Window & typeof globalThis.window
})

describe('fileTreeStore — selection', () => {
  it('selectOnly sets single path, anchor, and selected set', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().selectOnly('/repo/readme.md')

    const s = store.getState()
    expect(s.selectedFilePath).toBe('/repo/readme.md')
    expect(s.selectedPaths).toEqual(new Set(['/repo/readme.md']))
    expect(s.selectionAnchorPath).toBe('/repo/readme.md')
  })

  it('toggleSelection adds a path', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().selectOnly('/repo/readme.md')
    store.getState().toggleSelection('/repo/src')

    const s = store.getState()
    expect(s.selectedFilePath).toBe('/repo/src')
    expect(s.selectedPaths).toEqual(new Set(['/repo/readme.md', '/repo/src']))
    expect(s.selectionAnchorPath).toBe('/repo/src')
  })

  it('toggleSelection removes an existing path and updates primary', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().selectOnly('/repo/readme.md')
    store.getState().toggleSelection('/repo/src')
    store.getState().toggleSelection('/repo/readme.md')

    const s = store.getState()
    expect(s.selectedPaths).toEqual(new Set(['/repo/src']))
    expect(s.selectedFilePath).toBe('/repo/src')
  })

  it('toggleSelection removing last path sets primary to null', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().selectOnly('/repo/readme.md')
    store.getState().toggleSelection('/repo/readme.md')

    const s = store.getState()
    expect(s.selectedPaths).toEqual(new Set())
    expect(s.selectedFilePath).toBeNull()
  })

  it('clearSelection resets everything', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().selectOnly('/repo/readme.md')
    store.getState().clearSelection()

    const s = store.getState()
    expect(s.selectedFilePath).toBeNull()
    expect(s.selectedPaths).toEqual(new Set())
    expect(s.selectionAnchorPath).toBeNull()
  })

  it('extendSelection selects range between anchor and target', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.setState({
      rootEntries: MOCK_ROOT_ENTRIES,
      hasLoadedRoot: true,
    })
    store.getState().setShowOnlyChanges(false)
    store.getState().selectOnly('/repo/src')

    const rows = store.getState().flattenedRows
    if (rows.length < 3) return

    const lastPath = rows[rows.length - 1].key
    store.getState().extendSelection(lastPath)

    const s = store.getState()
    expect(s.selectedPaths.size).toBe(rows.length)
    expect(s.selectedFilePath).toBe(lastPath)
  })
})

describe('fileTreeStore — expansion', () => {
  it('toggle on unexpanded directory adds to expanded and triggers load', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.setState({
      rootEntries: MOCK_ROOT_ENTRIES,
      hasLoadedRoot: true,
    })
    store.getState().toggle(dir('src', '/repo/src'))

    const s = store.getState()
    expect(s.expanded.has('/repo/src')).toBe(true)
    expect(s.loadingPaths.has('/repo/src')).toBe(true)
    expect(mockAPI.fileTreeReadDirectory).toHaveBeenCalledWith('/repo/src', MOCK_ROOT)
  })

  it('toggle on expanded directory collapses', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.setState({
      rootEntries: MOCK_ROOT_ENTRIES,
      expanded: new Set(['/repo/src']),
      children: new Map([['/repo/src', MOCK_SRC_CHILDREN]]),
      hasLoadedRoot: true,
    })
    store.getState().toggle(dir('src', '/repo/src'))

    const s = store.getState()
    expect(s.expanded.has('/repo/src')).toBe(false)
  })

  it('toggle on file is a no-op', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    const expandedBefore = new Set(store.getState().expanded)
    store.getState().toggle(file('readme.md', '/repo/readme.md'))
    expect(store.getState().expanded).toEqual(expandedBefore)
  })

  it('expand is idempotent', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.setState({
      expanded: new Set(['/repo/src']),
      hasLoadedRoot: true,
    })
    store.getState().expand('/repo/src')
    expect(mockAPI.fileTreeReadDirectory).not.toHaveBeenCalledWith('/repo/src', MOCK_ROOT)
  })

  it('expand does nothing for root path', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.setState({ hasLoadedRoot: true })
    store.getState().expand(MOCK_ROOT)
    expect(store.getState().expanded.has(MOCK_ROOT)).toBe(false)
  })
})

describe('fileTreeStore — showOnlyChanges', () => {
  it('setShowOnlyChanges rebuilds flattened rows', async () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.setState({
      rootEntries: MOCK_ROOT_ENTRIES,
      hasLoadedRoot: true,
      statuses: new Map<string, FileStatus>([
        ['/repo/readme.md', 'added'],
        ['/repo/src/index.ts', 'modified'],
      ]),
      dirHasChange: new Set<string>(['/repo/src']),
    })

    store.getState().setShowOnlyChanges(true)
    await vi.waitFor(() => {
      const rows = store.getState().flattenedRows
      expect(rows.length).toBeGreaterThan(0)
    })

    const rows = store.getState().flattenedRows
    const names = rows.map((r) => r.entry.name)
    expect(names).not.toContain('tests')
    expect(names).toContain('src')
    expect(names).toContain('readme.md')
  })

  it('setShowOnlyChanges false shows all entries', async () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.setState({
      rootEntries: MOCK_ROOT_ENTRIES,
      hasLoadedRoot: true,
    })
    store.getState().setShowOnlyChanges(false)

    await vi.waitFor(() => {
      const rows = store.getState().flattenedRows
      expect(rows).toHaveLength(3)
    })
  })
})

describe('fileTreeStore — rename lifecycle', () => {
  it('setPendingRename sets path', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().setPendingRename('/repo/readme.md')
    expect(store.getState().pendingRenamePath).toBe('/repo/readme.md')
  })

  it('setPendingRename null clears', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().setPendingRename('/repo/readme.md')
    store.getState().setPendingRename(null)
    expect(store.getState().pendingRenamePath).toBeNull()
  })
})

describe('fileTreeStore — new entry lifecycle', () => {
  it('beginNewEntry sets pending with UUID token', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().beginNewEntry('/repo/src', PendingEntryKind.File)
    const p = store.getState().pendingNewEntry
    expect(p).not.toBeNull()
    expect(p!.parentPath).toBe('/repo/src')
    expect(p!.kind).toBe('file')
    expect(p!.token).toMatch(/^[0-9a-f-]+$/)
  })

  it('cancelNewEntry clears pending', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().beginNewEntry('/repo', PendingEntryKind.Folder)
    store.getState().cancelNewEntry()
    expect(store.getState().pendingNewEntry).toBeNull()
  })

  it('commitNewEntryDone clears pending', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().beginNewEntry('/repo', PendingEntryKind.Folder)
    store.getState().commitNewEntryDone()
    expect(store.getState().pendingNewEntry).toBeNull()
  })
})

describe('fileTreeStore — delete lifecycle', () => {
  it('setPendingDeletePaths stores paths', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().setPendingDeletePaths(['/repo/a', '/repo/b'])
    expect(store.getState().pendingDeletePaths).toEqual(['/repo/a', '/repo/b'])
  })

  it('clearPendingDelete empties array', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().setPendingDeletePaths(['/repo/a'])
    store.getState().clearPendingDelete()
    expect(store.getState().pendingDeletePaths).toEqual([])
  })
})

describe('fileTreeStore — cut paths', () => {
  it('setCutPaths stores set', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().setCutPaths(new Set(['/repo/a', '/repo/b']))
    expect(store.getState().cutPaths).toEqual(new Set(['/repo/a', '/repo/b']))
  })
})

describe('fileTreeStore — drop highlight', () => {
  it('setDropHighlight sets path', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().setDropHighlight('/repo/src')
    expect(store.getState().dropHighlightPath).toBe('/repo/src')
  })

  it('setDropHighlight null clears', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().setDropHighlight('/repo/src')
    store.getState().setDropHighlight(null)
    expect(store.getState().dropHighlightPath).toBeNull()
  })
})

describe('fileTreeStore — refreshStatuses', () => {
  it('parses raw status map into statuses + dirHasChange', async () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().refreshStatuses()

    await vi.waitFor(() => {
      const s = store.getState()
      expect(s.statuses.size).toBe(2)
      expect(s.statuses.get('/repo/src/index.ts')).toBe('modified')
      expect(s.statuses.get('/repo/readme.md')).toBe('added')
      expect(s.dirHasChange.has('/repo/src')).toBe(true)
    })
  })
})

describe('fileTreeStore — revealFile', () => {
  it('expands all ancestor directories', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.setState({
      hasLoadedRoot: true,
      children: new Map([['/repo/src', MOCK_SRC_CHILDREN]]),
    })
    store.getState().revealFile('/repo/src/index.ts')

    const s = store.getState()
    expect(s.expanded.has('/repo/src')).toBe(true)
    expect(s.selectedFilePath).toBe('/repo/src/index.ts')
  })

  it('does not load already-cached directories', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.setState({
      hasLoadedRoot: true,
      expanded: new Set(['/repo/src']),
      children: new Map([['/repo/src', MOCK_SRC_CHILDREN]]),
    })
    store.getState().revealFile('/repo/src/index.ts')

    expect(mockAPI.fileTreeReadDirectory).not.toHaveBeenCalledWith('/repo/src', MOCK_ROOT)
  })

  it('file at root level does not trigger expansion', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.setState({ hasLoadedRoot: true })
    store.getState().revealFile('/repo/readme.md')
    expect(store.getState().expanded.size).toBe(0)
  })
})

describe('fileTreeStore — dispose', () => {
  it('calls unsubscribe and stops git watch', () => {
    const unsub = vi.fn()
    const store = createFileTreeStore(MOCK_ROOT)
    store.setState({
      hasLoadedRoot: true,
      unsubscribeGitWatch: unsub,
    })
    store.getState().dispose()
    expect(unsub).toHaveBeenCalled()
    expect(mockAPI.gitWatchStop).toHaveBeenCalledWith(MOCK_ROOT)
  })
})

describe('fileTreeStore — loadRootIfNeeded', () => {
  it('only loads once', () => {
    const store = createFileTreeStore(MOCK_ROOT)
    store.getState().loadRootIfNeeded()
    store.getState().loadRootIfNeeded()
    store.getState().loadRootIfNeeded()
    expect(mockAPI.fileTreeReadDirectory).toHaveBeenCalledTimes(1)
    expect(mockAPI.gitWatchStart).toHaveBeenCalledTimes(1)
  })
})

describe('fileTreeStore — normalized root', () => {
  it('handles trailing slash root path', () => {
    const store = createFileTreeStore('/repo/')
    store.getState().loadRootIfNeeded()
    expect(mockAPI.fileTreeReadDirectory).toHaveBeenCalledWith('/repo', '/repo')
  })
})
