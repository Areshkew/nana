// Original: Muxy/Views/MainWindow.swift — right panel with VCS/FileTree mutual exclusivity
// Description: Right panel container for attached VCS or FileTree views.
//              Shows VCSTabView when VCS panel active, FileTreeView when file tree active.
//              Mutually exclusive: opening one closes the other.
// Status: Completed

import { useRightPanelStore } from '../stores/rightPanelStore'
import { useAppStore } from '../stores/appStore'
import { useWorktreeStore } from '../stores/worktreeStore'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { VCSTabView } from '../components/VCS/VCSTabView'
import { FileTreeView } from '../components/FileTree/FileTreeView'
import { RightPanelResizer } from '../components/RightPanelResizer'
import { useFileTreeStore } from '../hooks/useFileTreeStore'

export function RightPanel(): JSX.Element {
  const activeProjectID = useAppStore((s) => s.activeProjectID)
  const activeWorktreeMap = useAppStore((s) => s.activeWorktreeID)
  const activeWorktreeID = activeProjectID ? activeWorktreeMap[activeProjectID] ?? null : null
  const visible = useRightPanelStore((s) => s.visible)
  const activePanel = useRightPanelStore((s) => s.activePanel)
  const width = useRightPanelStore((s) => s.width)
  const setWidth = useRightPanelStore((s) => s.setWidth)
  const commitWidth = useRightPanelStore((s) => s.commitWidth)

  const worktree = activeProjectID && activeWorktreeID
    ? useWorktreeStore.getState().list(activeProjectID).find(w => w.id === activeWorktreeID)
    : undefined
  const repoPath = worktree?.path ?? ''
  const fileTreeStore = useFileTreeStore(repoPath || '/')

  return (
    <div className="flex h-full shrink-0" style={{ display: visible && activeProjectID ? 'flex' : 'none' }}>
      <RightPanelResizer
        width={width}
        onWidthChange={setWidth}
        onCommit={commitWidth}
      />
      <div
        className="flex h-full flex-col border-l border-[var(--nana-border)] bg-[var(--nana-bg)]"
        style={{ width }}
      >
        {activePanel === 'vcs' && repoPath && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <VCSTabView key={repoPath} repoPath={repoPath} />
          </div>
        )}
        {activePanel === 'vcs' && !repoPath && (
          <div className="flex h-full items-center justify-center text-sm text-[var(--nana-fg-dim)]">
            No active worktree
          </div>
        )}
        {activePanel === 'fileTree' && repoPath && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <FileTreeView
              key={repoPath}
              store={fileTreeStore}
              repoPath={repoPath}
              onOpenFile={(filePath, pin) => {
                if (activeProjectID) {
                  if (pin) {
                    useWorkspaceStore.getState().createEditorTabPinned(activeProjectID, filePath)
                  } else {
                    useWorkspaceStore.getState().createEditorTab(activeProjectID, filePath)
                  }
                }
              }}
            />
          </div>
        )}
        {activePanel === 'fileTree' && !repoPath && (
          <div className="flex h-full items-center justify-center text-sm text-[var(--nana-fg-dim)]">
            No active worktree
          </div>
        )}
      </div>
    </div>
  )
}
