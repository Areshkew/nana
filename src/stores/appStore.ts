// Original: Muxy/Models/AppState.swift (selection subset)
// Description: App state store for project/worktree selection + workspace sync.
// Status: ✅ Completed

import { create } from 'zustand'
import { type Project } from '../models/project'
import { type Worktree } from '../models/worktree'
import { useWorktreeStore } from './worktreeStore'
import { useWorkspaceStore } from './workspaceStore'

interface AppState {
  activeProjectID: string | null
  activeWorktreeID: Record<string, string>

  selectProject: (project: Project, worktree?: Worktree) => void
  selectWorktree: (projectID: string, worktree: Worktree) => void
  removeProject: (projectID: string) => void
  removeWorktree: (projectID: string, worktreeID: string) => void
  getActiveWorktree: (projectID: string) => Worktree | undefined
}

function syncWorkspaceSelection(
  projectID: string,
  worktreeID: string,
  worktreePath: string,
): void {
  const ws = useWorkspaceStore.getState()
  useWorkspaceStore.setState({
    activeProjectID: projectID,
    activeWorktreeID: { ...ws.activeWorktreeID, [projectID]: worktreeID },
  })
  ws.ensureWorkspace(projectID, worktreeID, worktreePath)
}

export const useAppStore = create<AppState>((set, get) => ({
  activeProjectID: null,
  activeWorktreeID: {},

  selectProject: (project: Project, worktree?: Worktree) => {
    const wt =
      worktree ??
      useWorktreeStore
        .getState()
        .preferred(project.id, get().activeWorktreeID[project.id])
    if (!wt) return
    set({
      activeProjectID: project.id,
      activeWorktreeID: {
        ...get().activeWorktreeID,
        [project.id]: wt.id,
      },
    })
    syncWorkspaceSelection(project.id, wt.id, wt.path)
  },

  selectWorktree: (projectID: string, worktree: Worktree) => {
    set({
      activeProjectID: projectID,
      activeWorktreeID: {
        ...get().activeWorktreeID,
        [projectID]: worktree.id,
      },
    })
    syncWorkspaceSelection(projectID, worktree.id, worktree.path)
  },

  removeProject: (projectID: string) => {
    set((state) => {
      const nextWorktreeID = { ...state.activeWorktreeID }
      delete nextWorktreeID[projectID]
      const remainingProjects = Object.keys(nextWorktreeID)
      const nextProjectID =
        state.activeProjectID === projectID
          ? remainingProjects[0] ?? null
          : state.activeProjectID
      return {
        activeProjectID: nextProjectID,
        activeWorktreeID: nextWorktreeID,
      }
    })
    useWorkspaceStore.getState().removeProject(projectID)
  },

  removeWorktree: (projectID: string, worktreeID: string) => {
    useWorkspaceStore.getState().removeWorktree(projectID, worktreeID)
    const ws = useWorkspaceStore.getState()
    set({
      activeProjectID: ws.activeProjectID,
      activeWorktreeID: { ...ws.activeWorktreeID },
    })
  },

  getActiveWorktree: (projectID: string) => {
    const worktreeID = get().activeWorktreeID[projectID]
    if (!worktreeID) return undefined
    return useWorktreeStore
      .getState()
      .list(projectID)
      .find((w) => w.id === worktreeID)
  },
}))
