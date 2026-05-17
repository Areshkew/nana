// Original: Muxy/Views/MainWindow.swift (topBarContent + navigationArrows)
// Description: Full-width draggable top bar with OS-adaptive window controls and navigation arrows.
// Status: Completed

import { useCallback, useState } from 'react'
import { WindowControls } from './WindowControls'
import { useNavigationStore } from '../stores/navigationStore'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useRightPanelStore } from '../stores/rightPanelStore'
import { performNavigation } from '../services/navigation'
import { ChevronLeft, ChevronRight, Settings, GitBranch, FolderTree } from 'lucide-react'
import { useMountEffect } from '../hooks/useMountEffect'

interface TopBarProps {
  onOpenSettings: (tab?: string) => void
}

export function TopBar({ onOpenSettings }: TopBarProps): JSX.Element {
  const canGoBack = useNavigationStore((s) => s.canGoBack)
  const canGoForward = useNavigationStore((s) => s.canGoForward)
  const rightPanelVisible = useRightPanelStore((s) => s.visible && s.activePanel === 'vcs')
  const fileTreeVisible = useRightPanelStore((s) => s.visible && s.activePanel === 'fileTree')
  const toggleVCS = useRightPanelStore((s) => s.toggleVCS)
  const toggleFileTree = useRightPanelStore((s) => s.toggleFileTree)
  const [isMac, setIsMac] = useState(false)

  useMountEffect(() => {
    void window.electronAPI.platform().then((p) => setIsMac(p === 'darwin'))
  })

  const handleBack = useCallback(() => {
    const state = useWorkspaceStore.getState()
    performNavigation(useNavigationStore.getState().goBack(state))
  }, [])

  const handleForward = useCallback(() => {
    const state = useWorkspaceStore.getState()
    performNavigation(useNavigationStore.getState().goForward(state))
  }, [])

  return (
    <div className="flex h-9 shrink-0 items-center border-b border-[var(--nana-border)] bg-[var(--nana-bg)] px-3 app-drag-region">
      {isMac && <WindowControls />}
      <div className="pointer-events-auto ml-3 flex items-center gap-0.5">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={handleBack}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg-muted)] disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[var(--nana-fg-dim)]"
          title="Back"
          aria-label="Navigate back"
        >
          <ChevronLeft size={12} />
        </button>
        <button
          type="button"
          disabled={!canGoForward}
          onClick={handleForward}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg-muted)] disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[var(--nana-fg-dim)]"
          title="Forward"
          aria-label="Navigate forward"
        >
          <ChevronRight size={12} />
        </button>
      </div>
      <div className="flex-1" />
      <button
        type="button"
        onClick={toggleFileTree}
        className={`pointer-events-auto flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--nana-hover)] ${fileTreeVisible ? 'text-[var(--nana-accent)]' : 'text-[var(--nana-fg-dim)] hover:text-[var(--nana-fg-muted)]'}`}
        title="File Explorer (Ctrl+Shift+F)"
        aria-label="Toggle File Explorer"
      >
        <FolderTree size={12} />
      </button>
      <button
        type="button"
        onClick={toggleVCS}
        className={`pointer-events-auto flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--nana-hover)] ${rightPanelVisible ? 'text-[var(--nana-accent)]' : 'text-[var(--nana-fg-dim)] hover:text-[var(--nana-fg-muted)]'}`}
        title="Source Control (Ctrl+Shift+G)"
        aria-label="Toggle Source Control"
      >
        <GitBranch size={12} />
      </button>
      <button
        type="button"
        onClick={() => onOpenSettings('general')}
        className="pointer-events-auto ml-1 flex h-5 w-5 items-center justify-center rounded text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg-muted)]"
        title="Settings (⌘,)"
        aria-label="Open Settings"
      >
        <Settings size={12} />
      </button>
      {!isMac && (
        <div className="pointer-events-auto -mr-3 ml-1 self-stretch">
          <WindowControls />
        </div>
      )}
    </div>
  )
}
