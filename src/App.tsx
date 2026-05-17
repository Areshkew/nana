// Original: Muxy/Views/MainWindow.swift
// Description: Root app component — sidebar + workspace with project-aware tabs and splits.
// Status: Completed

import { useState, useCallback } from 'react'
import { Sidebar } from './views/Sidebar'
import { RightPanel } from './views/RightPanel'
import { WelcomeView } from './views/WelcomeView'
import { Workspace } from './views/Workspace'
import { SettingsView } from './views/SettingsView'
import { TopBar } from './components/TopBar'
import { ThemePickerAnchor } from './components/Settings/ThemePicker'
import { useAppStore } from './stores/appStore'
import { useWorkspaceStore } from './stores/workspaceStore'
import { useWorktreeStore } from './stores/worktreeStore'
import { useProjectStore } from './stores/projectStore'
import { useSettingsStore } from './stores/settingsStore'
import { useSidebarStore } from './stores/sidebarStore'
import { useThemeStore } from './stores/themeStore'
import { useTerminalSearchStore } from './stores/terminalSearchStore'
import { useRightPanelStore } from './stores/rightPanelStore'
import { useNavigationStore } from './stores/navigationStore'
import { usePtySideEffects } from './hooks/usePtySideEffects'
import { useMountEffect } from './hooks/useMountEffect'
import { startAutoSave, flushSave, restoreWorkspaces } from './services/workspaceAutoSave'
import { subscribeNavigationToWorkspace } from './stores/navigationStore'
import { performNavigation } from './services/navigation'
import { ConfirmModal } from './components/ConfirmModal'
import { AddProjectDialog } from './components/AddProjectDialog'
import { QuickOpenOverlay } from './components/QuickOpenOverlay'
import { findArea } from './models/split'
import { requestCloseTab } from './services/tabCloseConfirmation'

function App(): JSX.Element {
  const activeProjectID = useAppStore((s) => s.activeProjectID)
  const loaded = useProjectStore((s) => s.loaded)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<string | undefined>()
  const [quickOpenVisible, setQuickOpenVisible] = useState(false)
  usePtySideEffects()

  useMountEffect(() => {
    const cleanupAutoSave = startAutoSave(useWorkspaceStore)
    const cleanupNavigation = subscribeNavigationToWorkspace(useWorkspaceStore)

    // Capture-phase listener for Ctrl+Shift+G — Chromium intercepts this for Find Previous,
    // so we must run before the browser's built-in handler.
    function handleVCSShortcut(e: KeyboardEvent): void {
      if (e.key === 'G' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        const mode = useSettingsStore.getState().vcsDisplayMode
        if (mode === 'attached') {
          useRightPanelStore.getState().toggleVCS()
        } else if (mode === 'tab') {
          const ws = useWorkspaceStore.getState()
          if (ws.activeProjectID) {
            const wid = ws.activeWorktreeID[ws.activeProjectID]
            const key = wid ? `${ws.activeProjectID}:${wid}` : undefined
            const root = key ? ws.workspaceRoots[key] : undefined
            const focusedAreaID = key ? ws.focusedAreaID[key] : undefined
            if (root && focusedAreaID) {
              ws.createVCSTab(ws.activeProjectID, focusedAreaID)
            }
          }
        }
      }
    }
    window.addEventListener('keydown', handleVCSShortcut, true)

    const handleBeforeUnload = (): void => {
      void flushSave(useWorkspaceStore)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      }
      if (e.key === 'b' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        useSidebarStore.getState().toggle()
      }
      // Ctrl+Shift+G: toggle right VCS panel (captured in capture phase above)
      if (e.key === 'F' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        useRightPanelStore.getState().toggleFileTree()
      }
      // Cmd+F: toggle terminal search on focused pane
      if (e.key === 'f' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const ws = useWorkspaceStore.getState()
        const pid = ws.activeProjectID
        if (!pid) return
        const wid = ws.activeWorktreeID[pid]
        if (!wid) return
        const key = `${pid}:${wid}`
        const root = ws.workspaceRoots[key]
        if (!root) return
        const focusedAreaID = ws.focusedAreaID[key]
        if (!focusedAreaID) return
        const area = findArea(root, focusedAreaID)
        if (!area) return
        const activeTab = area.tabs.find((t) => t.id === area.activeTabID)
        if (activeTab?.content?.kind !== 'terminal') return
        const paneId = activeTab.content.pane.id
        const searchState = useTerminalSearchStore.getState().searchStates[paneId]
        const currentlyVisible = searchState?.isVisible ?? false
        if (currentlyVisible) {
          useTerminalSearchStore.getState().setSearchVisible(paneId, false)
        } else {
          useTerminalSearchStore.getState().setSearchVisible(paneId, true)
        }
        e.preventDefault()
      }
      // Cmd+P: toggle quick open overlay
      if (e.key === 'p' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        setQuickOpenVisible((prev) => !prev)
      }
      // Cmd/Ctrl+T: new tab
      if (e.key === 't' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        const ws = useWorkspaceStore.getState()
        const pid = ws.activeProjectID
        if (!pid) return
        const wid = ws.activeWorktreeID[pid]
        if (!wid) return
        const key = `${pid}:${wid}`
        const focusedAreaID = ws.focusedAreaID[key]
        if (focusedAreaID) {
          ws.createTab(pid, focusedAreaID)
        }
      }
      // Cmd/Ctrl+W: close current tab
      if (e.key === 'w' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        const ws = useWorkspaceStore.getState()
        const pid = ws.activeProjectID
        if (!pid) return
        const wid = ws.activeWorktreeID[pid]
        if (!wid) return
        const key = `${pid}:${wid}`
        const focusedAreaID = ws.focusedAreaID[key]
        if (!focusedAreaID) return
        const root = ws.workspaceRoots[key]
        if (!root) return
        const area = findArea(root, focusedAreaID)
        if (!area) return
        const activeTab = area.tabs.find((t) => t.id === area.activeTabID)
        if (activeTab) {
          void requestCloseTab({ projectID: pid, areaID: focusedAreaID, tabID: activeTab.id })
        }
      }
      {
        const active = document.activeElement
        const isTextInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
        const isXTerm = active?.closest('.xterm') !== null
        if (!isTextInput && !isXTerm) {
          if (e.key === 'ArrowLeft' && e.ctrlKey && (e.metaKey || !navigator.userAgent.includes('Mac'))) {
            e.preventDefault()
            const ws = useWorkspaceStore.getState()
            const entry = useNavigationStore.getState().goBack(ws)
            performNavigation(entry)
          }
          if (e.key === 'ArrowRight' && e.ctrlKey && (e.metaKey || !navigator.userAgent.includes('Mac'))) {
            e.preventDefault()
            const ws = useWorkspaceStore.getState()
            const entry = useNavigationStore.getState().goForward(ws)
            performNavigation(entry)
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    void (async () => {
      await useSettingsStore.getState().load()
      await useThemeStore.getState().loadThemes()
      const { windowTransparency } = useSettingsStore.getState()
      if (windowTransparency < 1.0) {
        void window.electronAPI.setWindowOpacity(windowTransparency)
      }
      if (!loaded) return
      const projects = useProjectStore.getState().projects
      const worktreeMap: Record<string, { id: string; path: string; isPrimary: boolean }[]> = {}
      for (const project of projects) {
        worktreeMap[project.id] = useWorktreeStore.getState().list(project.id).map((w) => ({
          id: w.id,
          path: w.path,
          isPrimary: w.isPrimary,
        }))
      }
      await restoreWorkspaces(useWorkspaceStore, projects, worktreeMap)

      const ws = useWorkspaceStore.getState()
      if (ws.activeProjectID) {
        const worktreeID = ws.activeWorktreeID[ws.activeProjectID]
        if (worktreeID) {
          const project = projects.find((p) => p.id === ws.activeProjectID)
          const worktreeList = useWorktreeStore.getState().list(ws.activeProjectID)
          const worktree = worktreeList.find((w) => w.id === worktreeID)
          if (project && worktree) {
            useAppStore.getState().selectProject(project, worktree)
          }
        }
      }
    })()

    return () => {
      window.removeEventListener('keydown', handleVCSShortcut, true)
      cleanupAutoSave()
      cleanupNavigation()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('keydown', handleKeyDown)
    }
  })

  const openSettings = useCallback((tab?: string) => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--nana-bg)]">
      <TopBar onOpenSettings={openSettings} />
      <div className="flex min-h-0 flex-1">
        <Sidebar onOpenThemePicker={openSettings} />
        <div className="flex-1">
          {activeProjectID ? <Workspace /> : <WelcomeView />}
        </div>
        <RightPanel />
      </div>
      <ConfirmModal />
      <AddProjectDialog />
      <ThemePickerAnchor />
      {quickOpenVisible && activeProjectID && (
        <QuickOpenOverlay
          projectPath={
            useAppStore.getState().getActiveWorktree(activeProjectID)?.path ?? ''
          }
          onSelect={(path) => {
            setQuickOpenVisible(false)
            useWorkspaceStore.getState().createEditorTab(activeProjectID, path)
          }}
          onDismiss={() => setQuickOpenVisible(false)}
        />
      )}
      {settingsOpen && (
        <SettingsView
          onClose={() => setSettingsOpen(false)}
          initialTab={settingsTab}
        />
      )}
    </div>
  )
}

export default App
