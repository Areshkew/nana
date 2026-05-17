// Original: Muxy/Models/TerminalTab.swift
// Description: TerminalTab with discriminated TabContent union.
// Status: ✅ Completed

export type TabKind = 'terminal' | 'vcs' | 'editor' | 'diffViewer' | 'chat' | 'browser' | 'simulator'

export interface TerminalPaneState {
  id: string
  projectPath: string
  title: string
  startupCommand?: string
  externalEditorFilePath?: string
}

export type TabContent =
  | { kind: 'terminal'; pane: TerminalPaneState }
  | { kind: 'vcs'; projectPath: string }
  | { kind: 'editor'; projectPath: string; filePath: string; displayTitle: string }
  | { kind: 'diffViewer'; projectPath: string; filePath: string; isStaged: boolean; displayTitle: string }
  | { kind: 'chat'; projectPath: string; provider: string; displayTitle: string }
  | { kind: 'browser'; projectPath: string; currentURL: string; displayTitle: string }
  | { kind: 'simulator'; projectPath: string; displayTitle: string }

export function getTabContentKind(content: TabContent): TabKind {
  return content.kind
}

export function getTabContentProjectPath(content: TabContent): string {
  switch (content.kind) {
    case 'terminal': return content.pane.projectPath
    case 'vcs': return content.projectPath
    case 'editor': return content.projectPath
    case 'diffViewer': return content.projectPath
    case 'chat': return content.projectPath
    case 'browser': return content.projectPath
    case 'simulator': return content.projectPath
  }
}

export function getTabTitle(tab: TerminalTab): string {
  if (tab.customTitle) return tab.customTitle
  switch (tab.content.kind) {
    case 'terminal': return tab.content.pane.title
    case 'vcs': return 'Git Diff'
    case 'editor': return tab.content.displayTitle
    case 'diffViewer': return tab.content.displayTitle
    case 'chat': return tab.content.displayTitle
    case 'browser': return tab.content.displayTitle
    case 'simulator': return tab.content.displayTitle
  }
}

export interface TerminalTab {
  id: string
  customTitle: string | null
  colorID: string | null
  isPinned: boolean
  content: TabContent
}

export function createTerminalTab(projectPath: string): TerminalTab {
  const pane: TerminalPaneState = {
    id: crypto.randomUUID(),
    projectPath,
    title: 'Terminal',
  }
  return {
    id: crypto.randomUUID(),
    customTitle: null,
    colorID: null,
    isPinned: false,
    content: { kind: 'terminal', pane },
  }
}

export function createTerminalTabWithCommand(
  projectPath: string,
  title: string,
  startupCommand: string,
  externalEditorFilePath: string,
): TerminalTab {
  const pane: TerminalPaneState = {
    id: crypto.randomUUID(),
    projectPath,
    title,
    startupCommand,
    externalEditorFilePath,
  }
  return {
    id: crypto.randomUUID(),
    customTitle: null,
    colorID: null,
    isPinned: false,
    content: { kind: 'terminal', pane },
  }
}

export function createVCSTab(projectPath: string): TerminalTab {
  return {
    id: crypto.randomUUID(),
    customTitle: null,
    colorID: null,
    isPinned: false,
    content: { kind: 'vcs', projectPath },
  }
}

export function createChatTab(projectPath: string, provider: string): TerminalTab {
  return {
    id: crypto.randomUUID(),
    customTitle: null,
    colorID: null,
    isPinned: false,
    content: { kind: 'chat', projectPath, provider, displayTitle: provider },
  }
}

export function createBrowserTab(projectPath: string, url: string): TerminalTab {
  return {
    id: crypto.randomUUID(),
    customTitle: null,
    colorID: null,
    isPinned: false,
    content: { kind: 'browser', projectPath, currentURL: url, displayTitle: 'Browser' },
  }
}

export function createEditorTab(projectPath: string, filePath: string, isPinned = false): TerminalTab {
  const name = filePath.split(/[\\/]/).pop() ?? filePath
  return {
    id: crypto.randomUUID(),
    customTitle: null,
    colorID: null,
    isPinned,
    content: { kind: 'editor', projectPath, filePath, displayTitle: name },
  }
}

export function createDiffViewerTab(
  projectPath: string,
  filePath: string,
  isStaged: boolean,
  isPinned = false,
): TerminalTab {
  const name = filePath.split(/[\\/]/).pop() ?? filePath
  return {
    id: crypto.randomUUID(),
    customTitle: null,
    colorID: null,
    isPinned,
    content: { kind: 'diffViewer', projectPath, filePath, isStaged, displayTitle: name },
  }
}

export function createSimulatorTab(projectPath: string): TerminalTab {
  return {
    id: crypto.randomUUID(),
    customTitle: null,
    colorID: null,
    isPinned: false,
    content: { kind: 'simulator', projectPath, displayTitle: 'Simulator' },
  }
}
