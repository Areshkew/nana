// Original: Muxy/Services/WorktreeStore.swift
// Description: Zustand store for worktree management per project with git reconciliation.
// Status: Completed

import { create } from 'zustand'
import { createWorktree, type Worktree, isExternallyManaged, canBeRemoved } from '../models/worktree'
import { type Project } from '../models/project'
import {
  loadWorktrees,
  saveWorktrees,
  removeWorktrees,
} from '../services/persistence'
import {
  listWorktrees as listGitWorktrees,
  type GitWorktreeRecord,
} from '../services/git/worktree'

interface WorktreeState {
  worktrees: Record<string, Worktree[]>
  loadedProjects: Set<string>
  projectIDByPath: Record<string, string>

  loadForProject: (project: Project) => Promise<void>
  ensurePrimary: (project: Project) => void
  list: (projectID: string) => Worktree[]
  primary: (projectID: string) => Worktree | undefined
  preferred: (projectID: string, preferredID?: string | null) => Worktree | undefined
  worktreeByID: (projectID: string, worktreeID: string) => Worktree | undefined
  projectIDForPath: (path: string) => string | undefined
  add: (worktree: Worktree, projectID: string) => void
  remove: (worktreeID: string, projectID: string) => void
  rename: (worktreeID: string, projectID: string, newName: string) => void
  updateBranch: (worktreeID: string, projectID: string, branch: string | null) => void
  refreshFromGit: (project: Project) => Promise<Worktree[]>
  removeProject: (projectID: string) => Promise<void>
  save: (projectID: string) => Promise<void>
}

function canonicalPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

function defaultNameForRecord(record: GitWorktreeRecord): string {
  const branch = record.branch?.trim()
  if (branch && branch.length > 0) return branch
  const parts = record.path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] ?? 'worktree'
}

const EMPTY_WORKTREES: Worktree[] = []

export const useWorktreeStore = create<WorktreeState>((set, get) => ({
  worktrees: {},
  loadedProjects: new Set(),
  projectIDByPath: {},

  loadForProject: async (project: Project) => {
    if (get().loadedProjects.has(project.id)) return
    let loaded = await loadWorktrees(project.id)
    if (!loaded.some((w) => w.isPrimary)) {
      loaded = [makePrimary(project), ...loaded]
      await saveWorktrees(project.id, loaded)
    }
    setWorktrees(set, get, project.id, sortPrimaryFirst(loaded))
  },

  ensurePrimary: (project: Project) => {
    const list = get().worktrees[project.id] ?? []
    if (list.some((w) => w.isPrimary)) return
    const next = sortPrimaryFirst([makePrimary(project), ...list])
    setWorktrees(set, get, project.id, next)
    void get().save(project.id)
  },

  list: (projectID: string) => {
    return get().worktrees[projectID] ?? EMPTY_WORKTREES
  },

  primary: (projectID: string) => {
    return get().list(projectID).find((w) => w.isPrimary)
  },

  preferred: (projectID: string, preferredID?: string | null) => {
    const list = get().list(projectID)
    return (
      list.find((w) => w.id === preferredID) ??
      list.find((w) => w.isPrimary) ??
      list[0]
    )
  },

  worktreeByID: (projectID: string, worktreeID: string) => {
    return get().list(projectID).find((w) => w.id === worktreeID)
  },

  projectIDForPath: (path: string) => {
    return get().projectIDByPath[canonicalPath(path)]
  },

  add: (worktree: Worktree, projectID: string) => {
    const list = get().worktrees[projectID] ?? []
    const next = sortPrimaryFirst([...list, worktree])
    setWorktrees(set, get, projectID, next)
    void get().save(projectID)
  },

  remove: (worktreeID: string, projectID: string) => {
    const list = get().worktrees[projectID]
    if (!list) return
    const next = list.filter((w) => !(w.id === worktreeID && canBeRemoved(w)))
    setWorktrees(set, get, projectID, next)
    void get().save(projectID)
  },

  rename: (worktreeID: string, projectID: string, newName: string) => {
    const list = get().worktrees[projectID]
    if (!list) return
    const idx = list.findIndex((w) => w.id === worktreeID)
    if (idx === -1) return
    const next = [...list]
    next[idx] = { ...next[idx], name: newName }
    setWorktrees(set, get, projectID, next)
    void get().save(projectID)
  },

  updateBranch: (worktreeID: string, projectID: string, branch: string | null) => {
    const list = get().worktrees[projectID]
    if (!list) return
    const idx = list.findIndex((w) => w.id === worktreeID)
    if (idx === -1) return
    const next = [...list]
    next[idx] = { ...next[idx], branch }
    setWorktrees(set, get, projectID, next)
    void get().save(projectID)
  },

  refreshFromGit: async (project: Project) => {
    get().ensurePrimary(project)

    const records = await listGitWorktrees(project.path)
    const filtered = records.filter((r) => !r.isBare && !r.isPrunable)

    const list = [...(get().worktrees[project.id] ?? [])] as Worktree[]
    const projectKey = canonicalPath(project.path)
    const recordKeys = new Set(filtered.map((r) => canonicalPath(r.path)))

    const primaryIdx = list.findIndex((w) => w.isPrimary)
    if (primaryIdx !== -1) {
      list[primaryIdx] = { ...list[primaryIdx], path: project.path, name: project.name }
    } else {
      list.unshift(makePrimary(project))
    }

    const existingByKey: Record<string, Worktree> = {}
    for (const wt of list) {
      const key = canonicalPath(wt.path)
      const existing = existingByKey[key]
      if (existing) {
        if (wt.isPrimary && !existing.isPrimary) {
          existingByKey[key] = wt
        }
      } else {
        existingByKey[key] = wt
      }
    }

    for (const record of filtered) {
      const recordKey = canonicalPath(record.path)
      if (recordKey === projectKey) {
        const idx = list.findIndex((w) => w.isPrimary)
        if (idx !== -1) {
          list[idx] = { ...list[idx], branch: record.branch }
        }
        continue
      }

      const existing = existingByKey[recordKey]
      if (existing) {
        const idx = list.findIndex((w) => w.id === existing.id)
        if (idx !== -1) {
          list[idx] = { ...list[idx], branch: record.branch }
        }
        continue
      }

      list.push(createWorktree(defaultNameForRecord(record), record.path, {
        branch: record.branch,
        source: 'external',
        isPrimary: false,
      }))
    }

    const sorted = sortPrimaryFirst(list.filter(
      (w) => !isExternallyManaged(w) || recordKeys.has(canonicalPath(w.path)),
    ))
    setWorktrees(set, get, project.id, sorted)
    await get().save(project.id)
    return sorted
  },

  removeProject: async (projectID: string) => {
    set((state) => {
      const next = { ...state.worktrees }
      delete next[projectID]
      const loaded = new Set(state.loadedProjects)
      loaded.delete(projectID)
      const nextByPath = { ...state.projectIDByPath }
      for (const [path, id] of Object.entries(state.projectIDByPath)) {
        if (id === projectID) delete nextByPath[path]
      }
      return { worktrees: next, loadedProjects: loaded, projectIDByPath: nextByPath }
    })
    await removeWorktrees(projectID)
  },

  save: async (projectID: string) => {
    const list = get().worktrees[projectID]
    if (!list) return
    await saveWorktrees(projectID, list)
  },
}))

function makePrimary(project: Project): Worktree {
  return createWorktree(project.name, project.path, {
    source: 'nana',
    isPrimary: true,
  })
}

function sortPrimaryFirst(list: Worktree[]): Worktree[] {
  const primary = list.filter((w) => w.isPrimary)
  const others = list
    .filter((w) => !w.isPrimary)
    .sort(
      (a, b) =>
        new Date(a.createdAt ?? 0).getTime() -
        new Date(b.createdAt ?? 0).getTime(),
    )
  return [...primary, ...others]
}

function setWorktrees(
  set: (fn: (state: WorktreeState) => Partial<WorktreeState>) => void,
  get: () => WorktreeState,
  projectID: string,
  list: Worktree[],
): void {
  const prev = get().worktrees[projectID]
  const nextByPath = { ...get().projectIDByPath }
  if (prev) {
    for (const wt of prev) {
      const key = canonicalPath(wt.path)
      if (nextByPath[key] === projectID) delete nextByPath[key]
    }
  }
  for (const wt of list) {
    nextByPath[canonicalPath(wt.path)] = projectID
  }
  set((state) => ({
    worktrees: { ...state.worktrees, [projectID]: list },
    loadedProjects: new Set(state.loadedProjects).add(projectID),
    projectIDByPath: nextByPath,
  }))
}
