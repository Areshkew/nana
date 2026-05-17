// Original: Muxy/Models/Worktree.swift + WorktreeConfig.swift tests
// Description: Unit tests for Worktree model and WorktreeConfig parser.

import { describe, it, expect } from 'vitest'
import {
  createWorktree,
  isExternallyManaged,
  canBeRemoved,
  parseWorktreeConfig,
  worktreeSchema,
} from '../worktree'

describe('Worktree model', () => {
  it('creates a primary worktree', () => {
    const wt = createWorktree('MyProject', '/projects/my', { isPrimary: true })
    expect(wt.name).toBe('MyProject')
    expect(wt.path).toBe('/projects/my')
    expect(wt.isPrimary).toBe(true)
    expect(wt.source).toBe('nana')
  })

  it('creates a secondary worktree with branch', () => {
    const wt = createWorktree('feature-x', '/projects/my-wt', {
      branch: 'feature/x',
      ownsBranch: true,
      isPrimary: false,
    })
    expect(wt.branch).toBe('feature/x')
    expect(wt.ownsBranch).toBe(true)
    expect(wt.isPrimary).toBe(false)
  })

  it('validates via zod schema', () => {
    const raw = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'test',
      path: '/test',
      isPrimary: true,
    }
    const result = worktreeSchema.safeParse(raw)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('test')
    }
  })

  it('rejects invalid worktree data', () => {
    const raw = { id: 'not-a-uuid', name: '', path: '' }
    const result = worktreeSchema.safeParse(raw)
    expect(result.success).toBe(false)
  })

  it('detects externally managed worktree', () => {
    const external = createWorktree('ext', '/ext', {
      source: 'external',
      isPrimary: false,
    })
    expect(isExternallyManaged(external)).toBe(true)
    expect(canBeRemoved(external)).toBe(false)
  })

  it('allows removing secondary nana worktrees', () => {
    const secondary = createWorktree('sec', '/sec', {
      source: 'nana',
      isPrimary: false,
    })
    expect(canBeRemoved(secondary)).toBe(true)
  })

  it('prevents removing primary worktrees', () => {
    const primary = createWorktree('prim', '/prim', { isPrimary: true })
    expect(canBeRemoved(primary)).toBe(false)
  })
})

describe('WorktreeConfig parser', () => {
  it('parses object format with names', () => {
    const raw = {
      setup: [
        { command: 'pnpm install', name: 'Install' },
        { command: 'pnpm dev' },
      ],
    }
    const config = parseWorktreeConfig(raw)
    expect(config).not.toBeNull()
    expect(config?.setup).toHaveLength(2)
    expect(config?.setup[0]).toEqual({ command: 'pnpm install', name: 'Install' })
  })

  it('parses legacy string array format', () => {
    const raw = {
      setup: ['npm install', 'npm test'],
    }
    const config = parseWorktreeConfig(raw)
    expect(config).not.toBeNull()
    expect(config?.setup).toHaveLength(2)
    expect(config?.setup[0]).toEqual({ command: 'npm install' })
  })

  it('returns null for invalid data', () => {
    const config = parseWorktreeConfig({ foo: 'bar' })
    expect(config).toBeNull()
  })
})
