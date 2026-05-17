// Original: Muxy/Models/AppState.swift (goBack/goForward + applyNavigationEntry)
// Description: Shared navigation helper — applies a navigation entry by syncing appStore and workspaceStore.
// Status: Completed

import { useAppStore } from '../stores/appStore'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { type NavigationEntry } from '../models/navigationHistory'

export function performNavigation(entry: NavigationEntry | null): void {
  if (!entry) return
  const appState = useAppStore.getState()
  if (appState.activeProjectID !== entry.projectID || appState.activeWorktreeID[entry.projectID] !== entry.worktreeID) {
    useAppStore.setState({
      activeProjectID: entry.projectID,
      activeWorktreeID: { ...appState.activeWorktreeID, [entry.projectID]: entry.worktreeID },
    })
  }
  useWorkspaceStore.getState().navigate(entry.projectID, entry.worktreeID, entry.areaID, entry.tabID ?? undefined)
}
