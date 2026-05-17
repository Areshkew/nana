// Original: Muxy/Models/Project.swift tests
// Description: Unit tests for Project model helpers.

import { describe, it, expect } from 'vitest'
import { createProject, sortProjects, reorderProjects, projectSchema } from '../project'

describe('Project model', () => {
  it('creates a project with defaults', () => {
    const p = createProject('Nana', '/dev/nana')
    expect(p.name).toBe('Nana')
    expect(p.path).toBe('/dev/nana')
    expect(p.sortOrder).toBe(0)
    expect(p.icon).toBeNull()
  })

  it('validates via zod schema', () => {
    const raw = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'test',
      path: '/test',
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    }
    const result = projectSchema.safeParse(raw)
    expect(result.success).toBe(true)
  })

  it('sorts projects by sortOrder', () => {
    const a = createProject('A', '/a', 2)
    const b = createProject('B', '/b', 0)
    const c = createProject('C', '/c', 1)
    const sorted = sortProjects([a, b, c])
    expect(sorted.map((p) => p.name)).toEqual(['B', 'C', 'A'])
  })

  it('reorders projects and updates sortOrder', () => {
    const a = createProject('A', '/a', 0)
    const b = createProject('B', '/b', 1)
    const c = createProject('C', '/c', 2)
    const reordered = reorderProjects([a, b, c], 0, 2)
    expect(reordered.map((p) => p.name)).toEqual(['B', 'C', 'A'])
    expect(reordered.map((p) => p.sortOrder)).toEqual([0, 1, 2])
  })
})
