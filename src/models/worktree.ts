// Original: Muxy/Models/Worktree.swift, WorktreeKey.swift, WorktreeConfig.swift
// Description: Worktree, WorktreeKey, and WorktreeConfig models with zod validation.
// Status: ✅ Completed

import { z } from 'zod'

export const worktreeSourceSchema = z.enum(['nana', 'external'])

export type WorktreeSource = z.infer<typeof worktreeSourceSchema>

export const worktreeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  path: z.string().min(1),
  branch: z.string().nullable().optional(),
  ownsBranch: z.boolean().default(false),
  source: worktreeSourceSchema.default('nana'),
  isPrimary: z.boolean(),
  createdAt: z.string().datetime().or(z.string()).optional(),
})

export type Worktree = z.infer<typeof worktreeSchema>

export function createWorktree(
  name: string,
  path: string,
  options: {
    branch?: string | null
    ownsBranch?: boolean
    source?: WorktreeSource
    isPrimary: boolean
  } = { isPrimary: false },
): Worktree {
  return {
    id: crypto.randomUUID(),
    name,
    path,
    branch: options.branch ?? null,
    ownsBranch: options.ownsBranch ?? false,
    source: options.source ?? 'nana',
    isPrimary: options.isPrimary,
    createdAt: new Date().toISOString(),
  }
}

export function isExternallyManaged(worktree: Worktree): boolean {
  return !worktree.isPrimary && worktree.source === 'external'
}

export function canBeRemoved(worktree: Worktree): boolean {
  return !worktree.isPrimary && !isExternallyManaged(worktree)
}

export interface WorktreeKey {
  projectID: string
  worktreeID: string
}

export function makeWorktreeKey(projectID: string, worktreeID: string): WorktreeKey {
  return { projectID, worktreeID }
}

export const worktreeConfigSchema = z.object({
  setup: z.array(
    z.union([
      z.object({ command: z.string(), name: z.string().optional() }),
      z.string(),
    ]),
  ).default([]),
})

export type WorktreeConfig = z.infer<typeof worktreeConfigSchema>

export function parseWorktreeConfig(raw: unknown): WorktreeConfig | null {
  if (typeof raw !== 'object' || raw === null) return null

  const obj = raw as Record<string, unknown>
  const setupRaw = obj.setup
  if (!Array.isArray(setupRaw)) return null

  const setup: { command: string; name?: string }[] = []
  for (const item of setupRaw) {
    if (typeof item === 'string') {
      setup.push({ command: item })
    } else if (
      typeof item === 'object' &&
      item !== null &&
      'command' in item &&
      typeof (item as Record<string, unknown>).command === 'string'
    ) {
      const entry = item as { command: string; name?: unknown }
      setup.push({
        command: entry.command,
        name: typeof entry.name === 'string' ? entry.name : undefined,
      })
    }
  }

  return { setup }
}
