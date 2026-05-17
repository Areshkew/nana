// Original: Muxy/Models/Project.swift
// Description: Project data model with zod runtime validation.
// Status: ✅ Completed

import { z } from 'zod'

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  path: z.string().min(1),
  sortOrder: z.number().int().default(0),
  createdAt: z.string().datetime().or(z.string()),
  icon: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  iconColor: z.string().nullable().optional(),
})

export type Project = z.infer<typeof projectSchema>

export function createProject(name: string, path: string, sortOrder = 0): Project {
  return {
    id: crypto.randomUUID(),
    name,
    path,
    sortOrder,
    createdAt: new Date().toISOString(),
    icon: null,
    logo: null,
    iconColor: null,
  }
}

export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function reorderProjects(
  projects: Project[],
  fromIndex: number,
  toIndex: number,
): Project[] {
  const result = [...projects]
  const [moved] = result.splice(fromIndex, 1)
  result.splice(toIndex > fromIndex ? toIndex : toIndex, 0, moved)
  return result.map((p, i) => ({ ...p, sortOrder: i }))
}
