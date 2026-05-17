// Original: Muxy/Services/ProjectPersistence.swift + WorktreePersistence.swift + WorkspacePersistence.swift
// Description: Main-process IPC handlers for project, worktree, workspace, and selection persistence.
// Status: Completed

import { ipcMain, app } from 'electron'
import path from 'path'
import { JSONFileStore, getConfigPath } from '../services/fileStore.js'

const projectStore = new JSONFileStore<unknown[]>(
  getConfigPath(app, 'projects.json'),
  { prettyPrinted: true },
)

const workspaceStore = new JSONFileStore<unknown[]>(
  getConfigPath(app, 'workspaces.json'),
  { prettyPrinted: true },
)

const selectionStore = new JSONFileStore<Record<string, unknown>>(
  getConfigPath(app, 'selection.json'),
  { prettyPrinted: true },
)

const settingsStore = new JSONFileStore<Record<string, unknown>>(
  getConfigPath(app, 'settings.json'),
  { prettyPrinted: true },
)

function getWorktreeStore(projectID: string): JSONFileStore<unknown[]> {
  return new JSONFileStore<unknown[]>(
    getConfigPath(app, path.join('worktrees', `${projectID}.json`)),
    { prettyPrinted: true },
  )
}

export function registerPersistenceHandlers(): void {
  ipcMain.handle('persistence:loadProjects', async () => {
    return (await projectStore.load()) ?? []
  })

  ipcMain.handle('persistence:saveProjects', async (_event, projects: unknown[]) => {
    await projectStore.save(projects)
  })

  ipcMain.handle('persistence:loadWorktrees', async (_event, projectID: string) => {
    if (typeof projectID !== 'string') throw new Error('Invalid projectID')
    return (await getWorktreeStore(projectID).load()) ?? []
  })

  ipcMain.handle('persistence:saveWorktrees', async (_event, projectID: string, worktrees: unknown[]) => {
    if (typeof projectID !== 'string') throw new Error('Invalid projectID')
    await getWorktreeStore(projectID).save(worktrees)
  })

  ipcMain.handle('persistence:removeWorktrees', async (_event, projectID: string) => {
    if (typeof projectID !== 'string') throw new Error('Invalid projectID')
    await getWorktreeStore(projectID).remove()
  })

  ipcMain.handle('persistence:loadWorkspaces', async () => {
    return (await workspaceStore.load()) ?? []
  })

  ipcMain.handle('persistence:saveWorkspaces', async (_event, workspaces: unknown[]) => {
    if (!Array.isArray(workspaces)) throw new Error('Invalid workspaces')
    await workspaceStore.save(workspaces)
  })

  ipcMain.handle('persistence:loadSelection', async () => {
    return (await selectionStore.load()) ?? {}
  })

  ipcMain.handle('persistence:saveSelection', async (_event, selection: Record<string, unknown>) => {
    if (typeof selection !== 'object' || selection === null) throw new Error('Invalid selection')
    await selectionStore.save(selection)
  })

  ipcMain.handle('persistence:loadSettings', async () => {
    return (await settingsStore.load()) ?? {}
  })

  ipcMain.handle('persistence:saveSettings', async (_event, settings: Record<string, unknown>) => {
    if (typeof settings !== 'object' || settings === null) throw new Error('Invalid settings')
    await settingsStore.save(settings)
  })
}
