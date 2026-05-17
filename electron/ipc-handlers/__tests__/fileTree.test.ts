// Original: Muxy/Services/FileTreeService.swift — prune list, sanitize, unique name, path containment
// Description: Unit tests for extracted pure helpers used by fileTree IPC handlers.
// Status: ✅ Completed

import { describe, it, expect } from 'vitest'
import { sanitize, uniquePath, isInsidePath, PRUNED_NAMES } from '../fileTreeUtils'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const SEP = path.sep

describe('sanitize', () => {
  it('returns trimmed valid name', () => {
    expect(sanitize('  hello.txt  ')).toBe('hello.txt')
  })

  it('accepts name with dots (but not . or ..)', () => {
    expect(sanitize('.env')).toBe('.env')
    expect(sanitize('file.min.js')).toBe('file.min.js')
  })

  it('throws on empty string', () => {
    expect(() => sanitize('')).toThrow('Invalid name')
  })

  it('throws on whitespace-only', () => {
    expect(() => sanitize('   ')).toThrow('Invalid name')
  })

  it('throws on single dot', () => {
    expect(() => sanitize('.')).toThrow('Invalid name')
  })

  it('throws on double dot', () => {
    expect(() => sanitize('..')).toThrow('Invalid name')
  })

  it('throws on name containing slash', () => {
    expect(() => sanitize('foo/bar')).toThrow('Invalid name')
  })

  it('throws on name containing backslash', () => {
    expect(() => sanitize('foo\\bar')).not.toThrow()
  })

  it('throws on slash-only input', () => {
    expect(() => sanitize('/')).toThrow('Invalid name')
  })
})

describe('uniquePath', () => {
  it('returns base path when file does not exist', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nana-test-'))
    try {
      const result = await uniquePath('newfile.txt', tmpDir)
      expect(result).toBe(path.join(tmpDir, 'newfile.txt'))
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('appends counter when file exists', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nana-test-'))
    try {
      const existing = path.join(tmpDir, 'doc.txt')
      await fs.writeFile(existing, 'x')
      const result = await uniquePath('doc.txt', tmpDir)
      expect(result).toBe(path.join(tmpDir, 'doc 2.txt'))
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('increments counter for multiple collisions', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nana-test-'))
    try {
      await fs.writeFile(path.join(tmpDir, 'note.txt'), 'a')
      await fs.writeFile(path.join(tmpDir, 'note 2.txt'), 'b')
      await fs.writeFile(path.join(tmpDir, 'note 3.txt'), 'c')
      const result = await uniquePath('note.txt', tmpDir)
      expect(result).toBe(path.join(tmpDir, 'note 4.txt'))
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('handles extensionless names', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nana-test-'))
    try {
      await fs.writeFile(path.join(tmpDir, 'folder'), 'x')
      const result = await uniquePath('folder', tmpDir)
      expect(result).toBe(path.join(tmpDir, 'folder 2'))
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('handles hidden dotfiles with extension', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nana-test-'))
    try {
      await fs.writeFile(path.join(tmpDir, '.env'), 'a')
      const result = await uniquePath('.env', tmpDir)
      expect(result).toBe(path.join(tmpDir, '.env 2'))
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })
})

describe('isInsidePath', () => {
  it('child is inside parent', () => {
    expect(isInsidePath(`C:${SEP}a${SEP}b`, `C:${SEP}a`)).toBe(true)
  })

  it('deep descendant is inside ancestor', () => {
    expect(isInsidePath(`C:${SEP}a${SEP}b${SEP}c${SEP}d`, `C:${SEP}a${SEP}b`)).toBe(true)
  })

  it('sibling is not inside', () => {
    expect(isInsidePath(`C:${SEP}a${SEP}c`, `C:${SEP}a${SEP}b`)).toBe(false)
  })

  it('parent is not inside child', () => {
    expect(isInsidePath(`C:${SEP}a`, `C:${SEP}a${SEP}b`)).toBe(false)
  })

  it('equal paths returns true', () => {
    expect(isInsidePath(`C:${SEP}a${SEP}b`, `C:${SEP}a${SEP}b`)).toBe(true)
  })

  it('handles trailing forward slash on ancestor', () => {
    expect(isInsidePath(`C:${SEP}a${SEP}b${SEP}c`, `C:${SEP}a${SEP}b/`)).toBe(true)
  })

  it('handles trailing forward slash on target', () => {
    expect(isInsidePath(`C:${SEP}a${SEP}b${SEP}c`, `C:${SEP}a${SEP}b/`)).toBe(true)
  })

  it('prefix match is not inside (partial segment)', () => {
    expect(isInsidePath(`C:${SEP}abc`, `C:${SEP}a`)).toBe(false)
  })
})

describe('PRUNED_NAMES', () => {
  it('contains common ignore targets', () => {
    expect(PRUNED_NAMES.has('.git')).toBe(true)
    expect(PRUNED_NAMES.has('node_modules')).toBe(true)
    expect(PRUNED_NAMES.has('__pycache__')).toBe(true)
    expect(PRUNED_NAMES.has('.venv')).toBe(true)
    expect(PRUNED_NAMES.has('dist')).toBe(true)
    expect(PRUNED_NAMES.has('.idea')).toBe(true)
  })

  it('does not contain common source dirs', () => {
    expect(PRUNED_NAMES.has('src')).toBe(false)
    expect(PRUNED_NAMES.has('lib')).toBe(false)
    expect(PRUNED_NAMES.has('test')).toBe(false)
    expect(PRUNED_NAMES.has('tests')).toBe(false)
  })
})
