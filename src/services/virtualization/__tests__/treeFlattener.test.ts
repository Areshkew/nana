// Original: Muxy/Models/FileTreeState.swift — visibleRootEntries, visibleChildren, entryHasChanges
// Description: Tests for the recursive tree flattener with change filtering
// Status: Completed

import { describe, it, expect } from 'vitest'
import { flattenTree } from '../treeFlattener'
import type { FileTreeEntry, FileStatus } from '../treeFlattener'

function dir(name: string, path: string): FileTreeEntry {
  return { name, absolutePath: path, relativePath: name, isDirectory: true, isIgnored: false }
}

function file(name: string, path: string): FileTreeEntry {
  return { name, absolutePath: path, relativePath: name, isDirectory: false, isIgnored: false }
}

describe('flattenTree', () => {
  it('flattens a flat root (no directories expanded)', () => {
    const entries: FileTreeEntry[] = [
      file('a.txt', '/repo/a.txt'),
      file('b.txt', '/repo/b.txt'),
      file('c.txt', '/repo/c.txt'),
    ]
    const result = flattenTree({ rootEntries: entries, expanded: new Set(), children: new Map() })
    expect(result).toHaveLength(3)
    expect(result.map((r) => r.entry.name)).toEqual(['a.txt', 'b.txt', 'c.txt'])
    expect(result[0].depth).toBe(0)
    expect(result[0].type).toBe('item')
  })

  it('shows directory as group, not expanded', () => {
    const entries: FileTreeEntry[] = [dir('src', '/repo/src')]
    const result = flattenTree({ rootEntries: entries, expanded: new Set(), children: new Map() })
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('group')
    expect(result[0].expanded).toBe(false)
    expect(result[0].childCount).toBe(0)
  })

  it('expands a directory and shows children with increased depth', () => {
    const srcDir = dir('src', '/repo/src')
    const children = new Map<string, FileTreeEntry[]>([
      ['/repo/src', [file('index.ts', '/repo/src/index.ts'), file('app.ts', '/repo/src/app.ts')]],
    ])
    const expanded = new Set<string>(['/repo/src'])

    const result = flattenTree({
      rootEntries: [srcDir, file('readme.md', '/repo/readme.md')],
      expanded,
      children,
    })

    expect(result).toHaveLength(4)
    expect(result[0].entry.name).toBe('src')
    expect(result[0].type).toBe('group')
    expect(result[0].expanded).toBe(true)
    expect(result[0].depth).toBe(0)

    expect(result[1].entry.name).toBe('index.ts')
    expect(result[1].depth).toBe(1)

    expect(result[2].entry.name).toBe('app.ts')
    expect(result[2].depth).toBe(1)

    expect(result[3].entry.name).toBe('readme.md')
    expect(result[3].depth).toBe(0)
  })

  it('handles nested expansion', () => {
    const app = dir('app', '/repo/app')
    const views = dir('views', '/repo/app/views')
    const children = new Map<string, FileTreeEntry[]>([
      ['/repo/app', [views]],
      ['/repo/app/views', [file('home.tsx', '/repo/app/views/home.tsx')]],
    ])
    const expanded = new Set<string>(['/repo/app', '/repo/app/views'])

    const result = flattenTree({ rootEntries: [app], expanded, children })

    expect(result).toHaveLength(3)
    expect(result[0].entry.name).toBe('app')
    expect(result[0].depth).toBe(0)
    expect(result[1].entry.name).toBe('views')
    expect(result[1].depth).toBe(1)
    expect(result[2].entry.name).toBe('home.tsx')
    expect(result[2].depth).toBe(2)
  })

  it('filters to show-only-changes', () => {
    const entries: FileTreeEntry[] = [
      file('a.txt', '/repo/a.txt'),
      file('b.txt', '/repo/b.txt'),
      file('c.txt', '/repo/c.txt'),
    ]
    const statuses = new Map<string, 'modified'>([['/repo/b.txt', 'modified']])

    const result = flattenTree({
      rootEntries: entries,
      expanded: new Set(),
      children: new Map(),
      statuses,
      showOnlyChanges: true,
    })

    expect(result).toHaveLength(1)
    expect(result[0].entry.name).toBe('b.txt')
  })

  it('filters directories with changes in children', () => {
    const src = dir('src', '/repo/src')
    const entries: FileTreeEntry[] = [src, file('readme.md', '/repo/readme.md')]
    const dirHasChange = new Set<string>(['/repo/src'])

    const result = flattenTree({
      rootEntries: entries,
      expanded: new Set(),
      children: new Map(),
      dirHasChange,
      showOnlyChanges: true,
    })

    expect(result).toHaveLength(1)
    expect(result[0].entry.name).toBe('src')
  })

  it('assigns status correctly', () => {
    const entries: FileTreeEntry[] = [
      file('added.ts', '/repo/added.ts'),
      file('deleted.ts', '/repo/deleted.ts'),
      file('conflict.ts', '/repo/conflict.ts'),
    ]
    const statuses = new Map<string, FileStatus>([
      ['/repo/added.ts', 'added'],
      ['/repo/deleted.ts', 'deleted'],
      ['/repo/conflict.ts', 'conflict'],
    ])

    const result = flattenTree({ rootEntries: entries, expanded: new Set(), children: new Map(), statuses })

    expect(result[0].status).toBe('added')
    expect(result[1].status).toBe('deleted')
    expect(result[2].status).toBe('conflict')
  })

  it('produces unique indices', () => {
    const entries: FileTreeEntry[] = []
    for (let i = 0; i < 100; i++) {
      entries.push(file(`file${i}.ts`, `/repo/file${i}.ts`))
    }

    const result = flattenTree({ rootEntries: entries, expanded: new Set(), children: new Map() })

    expect(result).toHaveLength(100)
    const indices = result.map((r) => r.index)
    expect(new Set(indices).size).toBe(100)
  })

  it('handles empty root', () => {
    const result = flattenTree({ rootEntries: [], expanded: new Set(), children: new Map() })
    expect(result).toHaveLength(0)
  })

  it('uses absolutePath as stable key', () => {
    const f = file('x.ts', '/repo/x.ts')
    const result = flattenTree({ rootEntries: [f], expanded: new Set(), children: new Map() })

    expect(result[0].key).toBe('/repo/x.ts')
  })
})
