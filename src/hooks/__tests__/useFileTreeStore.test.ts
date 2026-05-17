// Original: Muxy/Views/MainWindow.swift — fileTreeStates dictionary
// Description: Unit tests for the per-worktree file tree store cache.
// Status: ✅ Completed

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function createMockAPI() {
  return {
    fileTreeReadDirectory: vi.fn().mockResolvedValue([]),
    fileTreeGitStatusPaths: vi.fn().mockResolvedValue({}),
    gitWatchStart: vi.fn().mockResolvedValue(undefined),
    gitWatchStop: vi.fn().mockResolvedValue(undefined),
    onGitDirectoryChanged: vi.fn().mockReturnValue(() => undefined),
  }
}

beforeEach(() => {
  globalThis.window = { electronAPI: createMockAPI() } as unknown as Window & typeof globalThis.window
})

afterEach(() => {
  vi.resetModules()
})

describe('useFileTreeStore cache', () => {
  it('same repoPath returns same store instance', async () => {
    const { getFileTreeStore } = await import('../useFileTreeStore')
    const a = getFileTreeStore('/repo/a')
    const b = getFileTreeStore('/repo/a')
    expect(a).toBe(b)
  })

  it('different repoPath returns different store instance', async () => {
    const { getFileTreeStore } = await import('../useFileTreeStore')
    const a = getFileTreeStore('/repo/a')
    const b = getFileTreeStore('/repo/b')
    expect(a).not.toBe(b)
  })

  it('disposeFileTreeStore calls dispose and removes from cache', async () => {
    const { getFileTreeStore, disposeFileTreeStore } = await import('../useFileTreeStore')
    const store = getFileTreeStore('/repo/x')
    disposeFileTreeStore('/repo/x')
    const fresh = getFileTreeStore('/repo/x')
    expect(fresh).not.toBe(store)
  })

  it('disposeFileTreeStore on unknown path is no-op', async () => {
    const { disposeFileTreeStore } = await import('../useFileTreeStore')
    expect(() => disposeFileTreeStore('/nonexistent')).not.toThrow()
  })

  it('re-create after dispose returns fresh instance', async () => {
    const { getFileTreeStore, disposeFileTreeStore } = await import('../useFileTreeStore')
    const first = getFileTreeStore('/repo/y')
    disposeFileTreeStore('/repo/y')
    const second = getFileTreeStore('/repo/y')
    expect(second).not.toBe(first)
    expect(second.getState().rootPath).toBe('/repo/y')
  })

  it('different paths with same base create separate stores (no auto-normalization)', async () => {
    const { getFileTreeStore } = await import('../useFileTreeStore')
    const a = getFileTreeStore('/repo/a/')
    const b = getFileTreeStore('/repo/a')
    expect(a).not.toBe(b)
  })
})
