// Original: Muxy/Services/ProjectStore.swift
// Description: Zustand store for project list management with persistence.
// Status: ✅ Completed

import { create } from 'zustand'
import {
  createProject,
  sortProjects,
  reorderProjects,
  type Project,
} from '../models/project'
import {
  loadProjects,
  saveProjects,
  openDirectory,
} from '../services/persistence'
import {
  hasGitDir,
  initRepository,
  findNestedRepos,
} from '../services/git/worktree'
import { showAddProjectDialog } from './addProjectDialogStore'
import { useWorktreeStore } from './worktreeStore'

interface ProjectState {
  projects: Project[]
  loaded: boolean
  addProject: (name: string, path: string) => Promise<void>
  removeProject: (id: string) => Promise<void>
  renameProject: (id: string, newName: string) => Promise<void>
  setIconColor: (id: string, colorId: string | null) => Promise<void>
  setLogo: (id: string, logoFilename: string | null) => Promise<void>
  reorder: (fromIndex: number, toIndex: number) => Promise<void>
  load: () => Promise<void>
  save: () => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loaded: false,

  addProject: async (name: string, path: string) => {
    const project = createProject(name, path, get().projects.length)
    const next = sortProjects([...get().projects, project])
    set({ projects: next })
    await get().save()
    // Auto-create primary worktree
    void useWorktreeStore.getState().ensurePrimary(project)
  },

  removeProject: async (id: string) => {
    const project = get().projects.find((p) => p.id === id)
    const next = get().projects.filter((p) => p.id !== id)
    set({ projects: next })
    await get().save()
    if (project?.logo) {
      void window.electronAPI.removeLogo(id)
    }
    await useWorktreeStore.getState().removeProject(id)
  },

  renameProject: async (id: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const next = get().projects.map((p) =>
      p.id === id ? { ...p, name: trimmed } : p,
    )
    set({ projects: next })
    await get().save()
  },

  setIconColor: async (id: string, colorId: string | null) => {
    const next = get().projects.map((p) =>
      p.id === id ? { ...p, iconColor: colorId } : p,
    )
    set({ projects: next })
    await get().save()
  },

  setLogo: async (id: string, logoFilename: string | null) => {
    const next = get().projects.map((p) =>
      p.id === id ? { ...p, logo: logoFilename } : p,
    )
    set({ projects: next })
    await get().save()
  },

  reorder: async (fromIndex: number, toIndex: number) => {
    const next = reorderProjects(get().projects, fromIndex, toIndex)
    set({ projects: next })
    await get().save()
  },

  load: async () => {
    if (get().loaded) return
    const projects = sortProjects(await loadProjects())
    set({ projects, loaded: true })
    // Load worktrees for all projects
    for (const project of projects) {
      await useWorktreeStore.getState().loadForProject(project)
    }
  },

  save: async () => {
    await saveProjects(get().projects)
  },
}))

export async function addProjectFromDialog(): Promise<void> {
  try {
    const path = await openDirectory()
    if (!path) return

    // Derive name from last path component
    const name = path.replace(/\\/g, '/').split('/').pop() ?? 'Project'

    const [isGitRepo, nestedRepos] = await Promise.all([
      hasGitDir(path).catch(() => false),
      findNestedRepos(path).catch(() => [] as string[]),
    ])

    if (!isGitRepo) {
      const choice = await showAddProjectDialog({
        title: 'Not a Git Repository',
        message: `"${name}" is not a git repository. You can initialize one now, proceed without git, or cancel.`,
        nestedRepos,
        showInitAction: true,
      })
      if (choice === null) return
      if (choice === 'init') {
        await initRepository(path)
      }
    } else if (nestedRepos.length > 0) {
      const choice = await showAddProjectDialog({
        title: 'Nested Repositories Found',
        message: `"${name}" is a git repository, but it contains nested git repositories. Adding this root may interfere with worktree management.`,
        nestedRepos,
        showInitAction: false,
      })
      if (choice !== 'proceed') return
    }

    await useProjectStore.getState().addProject(name, path)
  } catch (err) {
    console.error('[addProjectFromDialog] unexpected error:', err)
  }
}
