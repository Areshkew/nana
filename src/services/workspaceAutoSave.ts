// Original: Muxy/Models/AppState.swift (saveWorkspaces + saveSelection)
// Description: Debounced auto-save for workspace state and selection via Zustand subscribe.
// Status: Completed

import { type StoreApi } from 'zustand'
import { snapshotAll } from '../models/workspaceSnapshot'
import { type WorkspaceState } from '../stores/workspaceStore'
import { saveWorkspaces, saveSelection, type SelectionData } from '../services/persistence'

let saveTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 500

function scheduleSave(store: StoreApi<WorkspaceState>): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => {
    void doFlushSave(store)
  }, DEBOUNCE_MS)
}

async function doFlushSave(store: StoreApi<WorkspaceState>): Promise<void> {
  const state = store.getState()
  const snapshots = snapshotAll(
    state.workspaceRoots,
    state.focusedAreaID,
  )
  const selection: SelectionData = {
    activeProjectID: state.activeProjectID,
    activeWorktreeIDs: state.activeWorktreeID,
  }
  await Promise.all([
    saveWorkspaces(snapshots),
    saveSelection(selection),
  ])
}

export function startAutoSave(store: StoreApi<WorkspaceState>): () => void {
  const unsubscribe = store.subscribe(() => {
    scheduleSave(store)
  })
  return () => {
    unsubscribe()
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
    }
  }
}

export async function flushSave(store: StoreApi<WorkspaceState>): Promise<void> {
  if (saveTimer !== null) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  await doFlushSave(store)
}

export async function restoreWorkspaces(
  store: StoreApi<WorkspaceState>,
  projects: { id: string }[],
  worktrees: Record<string, { id: string; path: string; isPrimary: boolean }[]>,
): Promise<void> {
  const { loadWorkspaces, loadSelection } = await import('../services/persistence')
  const { restoreAll } = await import('../models/workspaceSnapshot')

  const [snapshots, selection] = await Promise.all([
    loadWorkspaces(),
    loadSelection(),
  ])

  const restored = restoreAll(snapshots, projects, worktrees)

  const workspaceRoots: Record<string, import('../models/split').SplitNode> = {}
  const focusedAreaID: Record<string, string> = {}
  for (const entry of restored) {
    const key = `${entry.key.projectID}:${entry.key.worktreeID}`
    workspaceRoots[key] = entry.root
    focusedAreaID[key] = entry.focusedAreaID
  }

  const activeWorktreeID: Record<string, string> = {}
  for (const project of projects) {
    const restoredKeysForProject = restored
      .filter((r) => r.key.projectID === project.id)
      .map((r) => r.key)
    if (restoredKeysForProject.length === 0) continue

    const savedWorktreeID = selection.activeWorktreeIDs[project.id]
    if (
      savedWorktreeID &&
      restoredKeysForProject.some((k) => k.worktreeID === savedWorktreeID)
    ) {
      activeWorktreeID[project.id] = savedWorktreeID
      continue
    }
    activeWorktreeID[project.id] = restoredKeysForProject[0].worktreeID
  }

  store.setState({
    workspaceRoots,
    focusedAreaID,
    activeProjectID: selection.activeProjectID,
    activeWorktreeID,
  })
}
