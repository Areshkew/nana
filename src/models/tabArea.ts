// Original: Muxy/Models/TabArea.swift
// Description: TabArea model and pure tab management functions.
// Status: ✅ Completed

import {
  type TerminalTab,
  createTerminalTab,
  createTerminalTabWithCommand,
  createVCSTab,
  createChatTab,
  createBrowserTab,
  createEditorTab,
  createDiffViewerTab,
  createSimulatorTab,
} from './tab'

export interface TabArea {
  id: string
  projectPath: string
  tabs: TerminalTab[]
  activeTabID: string | null
  tabHistory: string[]
}

export function createTabArea(projectPath: string): TabArea {
  const tab = createTerminalTab(projectPath)
  return {
    id: crypto.randomUUID(),
    projectPath,
    tabs: [tab],
    activeTabID: tab.id,
    tabHistory: [],
  }
}

export function createTabAreaWithTab(projectPath: string, tab: TerminalTab): TabArea {
  return {
    id: crypto.randomUUID(),
    projectPath,
    tabs: [tab],
    activeTabID: tab.id,
    tabHistory: [],
  }
}

function insertTab(area: TabArea, tab: TerminalTab): TabArea {
  const nextTabs = [...area.tabs, tab]
  const nextHistory = area.activeTabID
    ? [...area.tabHistory, area.activeTabID]
    : area.tabHistory
  return {
    ...area,
    tabs: nextTabs,
    activeTabID: tab.id,
    tabHistory: nextHistory,
  }
}

export function createTabInArea(area: TabArea): TabArea {
  return insertTab(area, createTerminalTab(area.projectPath))
}

export function createTabInDirectory(area: TabArea, directory: string): TabArea {
  return insertTab(area, createTerminalTab(directory))
}

export function createVCSTabInArea(area: TabArea): TabArea {
  return insertTab(area, createVCSTab(area.projectPath))
}

export function createChatTabInArea(area: TabArea, provider: string): TabArea {
  return insertTab(area, createChatTab(area.projectPath, provider))
}

export function createBrowserTabInArea(area: TabArea, url: string): TabArea {
  return insertTab(area, createBrowserTab(area.projectPath, url))
}

export function createEditorTabInArea(area: TabArea, filePath: string, isPinned = false): TabArea {
  const existing = area.tabs.find(
    (t) => t.content.kind === 'editor' && t.content.filePath === filePath,
  )
  if (existing) {
    if (isPinned && !existing.isPinned) {
      return togglePin(selectTab(area, existing.id), existing.id)
    }
    return selectTab(area, existing.id)
  }

  const replacementIndex = area.tabs.findIndex(
    (t) => t.content.kind === 'editor' && !t.isPinned,
  )
  if (replacementIndex !== -1) {
    const tab = createEditorTab(area.projectPath, filePath, isPinned)
    const nextTabs = [...area.tabs]
    nextTabs[replacementIndex] = tab
    const nextHistory = area.activeTabID
      ? [...area.tabHistory, area.activeTabID]
      : area.tabHistory
    return {
      ...area,
      tabs: nextTabs,
      activeTabID: tab.id,
      tabHistory: nextHistory,
    }
  }

  return insertTab(area, createEditorTab(area.projectPath, filePath, isPinned))
}

export function createExternalEditorTabInArea(area: TabArea, filePath: string, command: string): TabArea {
  const existing = area.tabs.find((t) =>
    t.content.kind === 'terminal' && t.content.pane.externalEditorFilePath === filePath,
  )
  if (existing) {
    return selectTab(area, existing.id)
  }
  const launchCmd = command.includes('{file}')
    ? command.replace('{file}', filePath)
    : `${command} "${filePath}"`
  const cmdName = command.trim().split(' ')[0]
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath
  const tab = createTerminalTabWithCommand(area.projectPath, `${cmdName} ${fileName}`, launchCmd, filePath)
  return insertTab(area, tab)
}

export function createDiffViewerTabInArea(
  area: TabArea,
  filePath: string,
  isStaged: boolean,
  isPinned = false,
): TabArea {
  const existing = area.tabs.find(
    (t) =>
      t.content.kind === 'diffViewer' &&
      t.content.filePath === filePath &&
      t.content.isStaged === isStaged,
  )
  if (existing) {
    if (isPinned && !existing.isPinned) {
      return togglePin(selectTab(area, existing.id), existing.id)
    }
    return selectTab(area, existing.id)
  }

  const replacementIndex = area.tabs.findIndex(
    (t) => t.content.kind === 'diffViewer' && !t.isPinned,
  )
  if (replacementIndex !== -1) {
    const tab = createDiffViewerTab(area.projectPath, filePath, isStaged, isPinned)
    const nextTabs = [...area.tabs]
    nextTabs[replacementIndex] = tab
    const nextHistory = area.activeTabID
      ? [...area.tabHistory, area.activeTabID]
      : area.tabHistory
    return {
      ...area,
      tabs: nextTabs,
      activeTabID: tab.id,
      tabHistory: nextHistory,
    }
  }

  return insertTab(area, createDiffViewerTab(area.projectPath, filePath, isStaged, isPinned))
}

export function createSimulatorTabInArea(area: TabArea): TabArea {
  return insertTab(area, createSimulatorTab(area.projectPath))
}

export type InsertSide = 'left' | 'right'

export function createTabAdjacent(area: TabArea, toTabID: string, side: InsertSide): TabArea {
  const index = area.tabs.findIndex((t) => t.id === toTabID)
  if (index === -1) return area
  const tab = createTerminalTab(area.projectPath)
  const insertIndex = side === 'left' ? index : index + 1
  const nextTabs = [...area.tabs]
  nextTabs.splice(insertIndex, 0, tab)
  const nextHistory = area.activeTabID
    ? [...area.tabHistory, area.activeTabID]
    : area.tabHistory
  return {
    ...area,
    tabs: nextTabs,
    activeTabID: tab.id,
    tabHistory: nextHistory,
  }
}

export function selectTab(area: TabArea, tabID: string): TabArea {
  if (area.activeTabID === tabID) return area
  const nextHistory = area.activeTabID
    ? [...area.tabHistory, area.activeTabID]
    : area.tabHistory
  return {
    ...area,
    activeTabID: tabID,
    tabHistory: nextHistory,
  }
}

export function selectTabByIndex(area: TabArea, index: number): TabArea {
  if (index < 0 || index >= area.tabs.length) return area
  return selectTab(area, area.tabs[index].id)
}

export function selectNextTab(area: TabArea): TabArea {
  if (area.tabs.length <= 1 || !area.activeTabID) return area
  const idx = area.tabs.findIndex((t) => t.id === area.activeTabID)
  if (idx === -1) return area
  const next = (idx + 1) % area.tabs.length
  return selectTab(area, area.tabs[next].id)
}

export function selectPreviousTab(area: TabArea): TabArea {
  if (area.tabs.length <= 1 || !area.activeTabID) return area
  const idx = area.tabs.findIndex((t) => t.id === area.activeTabID)
  if (idx === -1) return area
  const prev = (idx - 1 + area.tabs.length) % area.tabs.length
  return selectTab(area, area.tabs[prev].id)
}

export function closeTab(area: TabArea, tabID: string): { area: TabArea; removedPaneID?: string } {
  const index = area.tabs.findIndex((t) => t.id === tabID)
  if (index === -1) return { area }
  const tab = area.tabs[index]
  const nextTabs = area.tabs.filter((t) => t.id !== tabID)
  const nextHistory = area.tabHistory.filter((id) => id !== tabID)

  let nextActiveID = area.activeTabID
  if (area.activeTabID === tabID) {
    const validIDs = new Set(nextTabs.map((t) => t.id))
    nextActiveID = null
    while (nextHistory.length > 0 && !nextActiveID) {
      const prev = nextHistory.pop()
      if (prev && validIDs.has(prev)) {
        nextActiveID = prev
      }
    }
    nextActiveID ??= nextTabs[nextTabs.length - 1]?.id ?? null
  }

  const removedPaneID = tab.content.kind === 'terminal' ? tab.content.pane.id : undefined

  return {
    area: {
      ...area,
      tabs: nextTabs,
      activeTabID: nextActiveID,
      tabHistory: nextHistory,
    },
    removedPaneID,
  }
}

export function reorderTab(area: TabArea, sourceIndex: number, destinationIndex: number): TabArea {
  if (
    sourceIndex < 0 ||
    sourceIndex >= area.tabs.length ||
    destinationIndex < 0 ||
    destinationIndex > area.tabs.length
  ) {
    return area
  }
  const nextTabs = [...area.tabs]
  const [moved] = nextTabs.splice(sourceIndex, 1)
  const dest = destinationIndex > sourceIndex ? destinationIndex - 1 : destinationIndex
  nextTabs.splice(dest, 0, moved)
  return { ...area, tabs: nextTabs }
}

export function insertExistingTab(area: TabArea, tab: TerminalTab): TabArea {
  const nextTabs = [...area.tabs, tab]
  const nextHistory = area.activeTabID
    ? [...area.tabHistory, area.activeTabID]
    : area.tabHistory
  return {
    ...area,
    tabs: nextTabs,
    activeTabID: tab.id,
    tabHistory: nextHistory,
  }
}

export function setCustomTitle(area: TabArea, tabID: string, title: string | null): TabArea {
  const nextTabs = area.tabs.map((t) =>
    t.id === tabID ? { ...t, customTitle: title } : t,
  )
  return { ...area, tabs: nextTabs }
}

export function setTabColorID(area: TabArea, tabID: string, colorID: string | null): TabArea {
  const nextTabs = area.tabs.map((t) =>
    t.id === tabID ? { ...t, colorID } : t,
  )
  return { ...area, tabs: nextTabs }
}

export function togglePin(area: TabArea, tabID: string): TabArea {
  const index = area.tabs.findIndex((t) => t.id === tabID)
  if (index === -1) return area
  const nextTabs = [...area.tabs]
  nextTabs[index] = { ...nextTabs[index], isPinned: !nextTabs[index].isPinned }
  return { ...area, tabs: nextTabs }
}

export function pinTab(area: TabArea, tabID: string): TabArea {
  const index = area.tabs.findIndex((t) => t.id === tabID)
  if (index === -1 || area.tabs[index].isPinned) return area
  return togglePin(area, tabID)
}

export function getActiveTab(area: TabArea): TerminalTab | undefined {
  if (!area.activeTabID) return undefined
  return area.tabs.find((t) => t.id === area.activeTabID)
}
