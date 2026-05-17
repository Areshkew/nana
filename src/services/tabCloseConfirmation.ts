// Original: Muxy/Models/TabCloseConfirmationPreferences.swift + Muxy/Views/MainWindow.swift
// Description: Tab close confirmation logic — checks running process and last-tab before closing.
// Status: Completed

import { useWorkspaceStore } from '../stores/workspaceStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useEditorStore } from '../stores/editorStore'
import { confirm } from '../stores/confirmDialogStore'
import { useConfirmDialogStore } from '../stores/confirmDialogStore'
import { allAreas } from '../models/split'
import { type TerminalTab } from '../models/tab'
import { type WorktreeKey } from '../stores/workspaceStore'

interface CloseTabParams {
  projectID: string
  areaID: string
  tabID: string
}

function activeKey(state: { activeWorktreeID: Record<string, string> }, projectID: string): WorktreeKey | null {
  const worktreeID = state.activeWorktreeID[projectID]
  if (!worktreeID) return null
  return `${projectID}:${worktreeID}`
}

async function checkRunningProcess(tab: TerminalTab): Promise<boolean> {
  if (tab.content.kind !== 'terminal') return false
  try {
    return await window.electronAPI.ptyIsProcessRunning(tab.content.pane.id)
  } catch {
    return false
  }
}

export async function requestCloseTab(params: CloseTabParams): Promise<boolean> {
  const { projectID, areaID, tabID } = params
  const store = useWorkspaceStore.getState()
  const key = activeKey(store, projectID)
  if (!key) {
    store.closeTab(projectID, areaID, tabID)
    return true
  }

  const root = store.workspaceRoots[key]
  if (!root) {
    store.closeTab(projectID, areaID, tabID)
    return true
  }

  const area = allAreas(root).find((a) => a.id === areaID)
  if (!area) {
    store.closeTab(projectID, areaID, tabID)
    return true
  }

  const tab = area.tabs.find((t) => t.id === tabID)
  if (!tab) return false

  const settings = useSettingsStore.getState()

  if (tab.content.kind === 'terminal' && settings.confirmCloseRunningProcess) {
    const hasProcess = await checkRunningProcess(tab)
    if (hasProcess) {
      const shouldClose = await confirm({
        title: 'Close Tab?',
        message: 'A process is still running in this terminal. Do you want to close it?',
        confirmLabel: 'Close',
        cancelLabel: 'Cancel',
        destructive: true,
      })
      if (!shouldClose) return false

      useSettingsStore.getState().setConfirmCloseRunningProcess(false)
    }
  }

  if (tab.content.kind === 'editor') {
    const meta = useEditorStore.getState().getEditor(tabID)
    if (meta.isModified) {
      const fileName = tab.content.filePath.split(/[/\\]/).pop() ?? 'file'
      const result = await useConfirmDialogStore.getState().ask({
        title: `Save changes to "${fileName}"?`,
        message: "Your changes will be lost if you don't save them.",
        confirmLabel: 'Save',
        cancelLabel: 'Cancel',
        extraLabel: "Don't Save",
        extraDestructive: true,
      })

      if (result === false) return false

      if (result === true) {
        const editorEl = document.querySelector<HTMLElement>(`[data-editor-tab="${tabID}"] .cm-editor`)
        if (editorEl) {
          const { EditorView } = await import('@codemirror/view')
          const view = EditorView.findFromDOM(editorEl)
          if (view) {
            const content = view.state.doc.toString()
            await window.electronAPI.editorFileWrite(tab.content.filePath, content)
          }
        }
      }
    }
  }

  const areaCount = allAreas(root).length
  const isLastTabInArea = area.tabs.length <= 1
  const isLastArea = areaCount <= 1

  if (isLastTabInArea && isLastArea && !settings.keepOpenWhenNoTabs) {
    const shouldClose = await confirm({
      title: 'Close Project?',
      message: 'This is the last tab. Closing it will remove the project from the sidebar.',
      confirmLabel: 'Close',
      cancelLabel: 'Cancel',
      destructive: true,
    })
    if (!shouldClose) return false
  }

  store.closeTab(projectID, areaID, tabID)
  return true
}
