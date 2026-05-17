// Original: Tests/MuxyTests/GitWorktreeServiceTests.swift (implied)
// Description: Unit tests for git worktree porcelain parser.

import { describe, it, expect } from 'vitest'
import { parsePorcelain } from '../git/parsePorcelain'

describe('parsePorcelain', () => {
  it('parses a single worktree with branch', () => {
    const input = [
      'worktree /home/user/project',
      'HEAD abc123def456',
      'branch refs/heads/main',
      '',
    ].join('\n')

    const records = parsePorcelain(input)
    expect(records).toHaveLength(1)
    expect(records[0].path).toBe('/home/user/project')
    expect(records[0].head).toBe('abc123def456')
    expect(records[0].branch).toBe('main')
    expect(records[0].isBare).toBe(false)
    expect(records[0].isDetached).toBe(false)
    expect(records[0].isPrunable).toBe(false)
  })

  it('parses a detached worktree', () => {
    const input = [
      'worktree /home/user/project',
      'HEAD abc123def456',
      'detached',
      '',
    ].join('\n')

    const records = parsePorcelain(input)
    expect(records).toHaveLength(1)
    expect(records[0].isDetached).toBe(true)
    expect(records[0].branch).toBeNull()
  })

  it('parses a bare repository', () => {
    const input = [
      'worktree /home/user/repo.git',
      'HEAD abc123def456',
      'bare',
      '',
    ].join('\n')

    const records = parsePorcelain(input)
    expect(records).toHaveLength(1)
    expect(records[0].isBare).toBe(true)
  })

  it('parses a prunable worktree', () => {
    const input = [
      'worktree /home/user/project',
      'HEAD abc123def456',
      'branch refs/heads/feature',
      '',
      'worktree /home/user/other',
      'HEAD def456abc789',
      'prunable git worktree prune',
      '',
    ].join('\n')

    const records = parsePorcelain(input)
    expect(records).toHaveLength(2)
    expect(records[0].isPrunable).toBe(false)
    expect(records[1].isPrunable).toBe(true)
  })

  it('parses multiple worktrees', () => {
    const input = [
      'worktree /home/user/project',
      'HEAD abc123',
      'branch refs/heads/main',
      '',
      'worktree /home/user/feature-x',
      'HEAD def456',
      'branch refs/heads/feature-x',
      '',
    ].join('\n')

    const records = parsePorcelain(input)
    expect(records).toHaveLength(2)
    expect(records[0].path).toBe('/home/user/project')
    expect(records[0].branch).toBe('main')
    expect(records[1].path).toBe('/home/user/feature-x')
    expect(records[1].branch).toBe('feature-x')
  })

  it('handles branch without refs/heads/ prefix', () => {
    const input = [
      'worktree /project',
      'HEAD abc',
      'branch main',
      '',
    ].join('\n')

    const records = parsePorcelain(input)
    expect(records[0].branch).toBe('main')
  })

  it('handles empty input', () => {
    expect(parsePorcelain('')).toHaveLength(0)
  })

  it('handles trailing newline without blank line at end', () => {
    const input = 'worktree /project\nHEAD abc\nbranch main\n'
    const records = parsePorcelain(input)
    expect(records).toHaveLength(1)
  })

  it('handles Windows-style paths', () => {
    const input = [
      'worktree C:/Users/dev/project',
      'HEAD abc123',
      'branch refs/heads/main',
      '',
    ].join('\n')

    const records = parsePorcelain(input)
    expect(records[0].path).toBe('C:/Users/dev/project')
  })
})
