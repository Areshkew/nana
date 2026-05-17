// Original: Muxy/Views/Workspace/TabAreaView.swift
// Description: Tab container keeping inactive terminal tabs mounted.
//              Calls freeze/resume on the terminal lifecycle service when tabs switch.
// Status: ✅ Completed

import { type TerminalTab } from '../../models/tab'
import { type TabArea } from '../../models/tabArea'
import { type DropResult } from '../../models/drag'
import { TabStrip } from './TabStrip'
import { makeSnapshot } from './tabTypes'
import { TerminalPane } from '../Terminal/TerminalPane'
import { VCSTabView } from '../VCS/VCSTabView'
import { DiffViewerPane } from '../VCS/DiffViewerPane'
import { EditorPane } from '../Editor/EditorPane'
import { DropZoneOverlay } from './DropZoneOverlay'
import { useDragStore } from '../../stores/dragStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import {
  freezeTerminal,
  resumeTerminal,
} from '../../services/terminalLifecycle'

interface TabAreaViewProps {
  area: TabArea
  isFocused: boolean
  isActiveProject: boolean
  projectID: string
  onFocus: () => void
  onSelectTab: (tabID: string) => void
  onCreateTab: () => void
  onCreateVCSTab: () => void
  onCloseTab: (tabID: string) => void
  onSplit: (areaID: string, direction: 'horizontal' | 'vertical') => void
  onReorderTab: (oldIndex: number, newIndex: number) => void
  onTogglePin: (tabID: string) => void
  onSetCustomTitle: (tabID: string, title: string | null) => void
  onSetColorID: (tabID: string, colorID: string | null) => void
  onCreateTabAdjacent: (tabID: string, side: 'left' | 'right') => void
  onDropAction: (result: DropResult) => void
}

export function TabAreaView({
  area,
  isFocused,
  isActiveProject,
  projectID,
  onFocus,
  onSelectTab,
  onCreateTab,
  onCreateVCSTab,
  onCloseTab,
  onSplit,
  onReorderTab,
  onTogglePin,
  onSetCustomTitle,
  onSetColorID,
  onCreateTabAdjacent,
  onDropAction,
}: TabAreaViewProps): JSX.Element {
  const activeDrag = useDragStore((s) => s.activeDrag)
  const hoveredAreaID = useDragStore((s) => s.hoveredAreaID)
  const hoveredZone = useDragStore((s) => s.hoveredZone)
  const setPaneTitle = useWorkspaceStore((s) => s.setPaneTitle)

  const handleSelectTab = (tabID: string): void => {
    for (const tab of area.tabs) {
      if (tab.id === area.activeTabID && tab.content.kind === 'terminal') {
        freezeTerminal(tab.content.pane.id)
      }
    }

    onSelectTab(tabID)

    for (const tab of area.tabs) {
      if (tab.id === tabID && tab.content.kind === 'terminal') {
        resumeTerminal(tab.content.pane.id)
      }
    }
  }

  return (
    <div className="flex h-full w-full flex-col" onClick={onFocus}>
      <TabStrip
        areaID={area.id}
        tabs={area.tabs.map(makeSnapshot)}
        activeTabID={area.activeTabID}
        isFocused={isFocused}
        projectID={projectID}
        onSelectTab={handleSelectTab}
        onCloseTab={onCloseTab}
        onCreateTab={onCreateTab}
        onCreateVCSTab={onCreateVCSTab}
        onSplit={onSplit}
        onReorderTab={onReorderTab}
        onTogglePin={onTogglePin}
        onSetCustomTitle={onSetCustomTitle}
        onSetColorID={onSetColorID}
        onCreateTabAdjacent={onCreateTabAdjacent}
        onDropAction={onDropAction}
      />
      <div className="h-px w-full bg-white/10" />
      <div className="relative flex-1 overflow-hidden">
        {area.tabs.map((tab) => {
          const isActive = tab.id === area.activeTabID
          const shouldMount = isActive || tab.content.kind === 'terminal' || tab.content.kind === 'editor'
          if (!shouldMount) return null
          return (
            <div
              key={tab.id}
              className="absolute inset-0"
              style={{
                visibility: isActive ? 'visible' : 'hidden',
                zIndex: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              <TabContentView
                tab={tab}
                visible={isActive}
                focused={isActive && isFocused && isActiveProject}
                onFocus={onFocus}
                onTitleChange={(title) => {
                  if (tab.content.kind === 'terminal') {
                    setPaneTitle(projectID, tab.content.pane.id, title)
                  }
                }}
              />
            </div>
          )
        })}

        {activeDrag && hoveredAreaID === area.id && hoveredZone && (
          <DropZoneOverlay zone={hoveredZone} />
        )}
      </div>
    </div>
  )
}

function TabContentView({
  tab,
  visible,
  focused,
  onFocus,
  onTitleChange,
}: {
  tab: TerminalTab
  visible: boolean
  focused: boolean
  onFocus: () => void
  onTitleChange?: (title: string) => void
}): JSX.Element {
  switch (tab.content.kind) {
    case 'terminal':
      return (
        <TerminalPane
          paneId={tab.content.pane.id}
          cwd={tab.content.pane.projectPath}
          focused={focused}
          visible={visible}
          startupCommand={tab.content.pane.startupCommand}
          onFocus={onFocus}
          onTitleChange={onTitleChange}
        />
      )
    case 'vcs':
      return <VCSTabView repoPath={tab.content.projectPath} />
    case 'editor':
      return (
        <EditorPane
          tabId={tab.id}
          projectPath={tab.content.projectPath}
          filePath={tab.content.filePath}
          onFocus={onFocus}
        />
      )
    case 'diffViewer':
      return (
        <DiffViewerPane
          repoPath={tab.content.projectPath}
          filePath={tab.content.filePath}
          isStaged={tab.content.isStaged}
        />
      )
    case 'chat':
      return <PlaceholderTab label={`Chat: ${tab.content.displayTitle}`} onFocus={onFocus} />
    case 'browser':
      return <PlaceholderTab label={`Browser: ${tab.content.displayTitle}`} onFocus={onFocus} />
    case 'simulator':
      return <PlaceholderTab label="Simulator" onFocus={onFocus} />
    default:
      return <PlaceholderTab label="Unknown" onFocus={onFocus} />
  }
}

function PlaceholderTab({ label, onFocus }: { label: string; onFocus: () => void }): JSX.Element {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-[var(--nana-bg)] text-sm text-[var(--nana-fg-dim)]"
      onClick={onFocus}
    >
      {label}
    </div>
  )
}
