// Original: Muxy/Views/Workspace/TabStrip.swift
// Description: Horizontal tab bar with unified pointer drag for reorder + cross-pane split.
// Status: ✅ Completed

import { useState, useRef, useCallback } from 'react'
import { useMiddleClick } from '../../hooks/useMiddleClick'
import { useDragStore } from '../../stores/dragStore'
import { type DropResult } from '../../models/drag'
import { type TabSnapshot } from './tabTypes'

interface TabStripProps {
  areaID: string
  tabs: TabSnapshot[]
  activeTabID: string | null
  isFocused: boolean
  projectID: string
  onSelectTab: (tabID: string) => void
  onCloseTab: (tabID: string) => void
  onCreateTab: () => void
  onCreateVCSTab: () => void
  onSplit: (areaID: string, direction: 'horizontal' | 'vertical') => void
  onReorderTab: (oldIndex: number, newIndex: number) => void
  onTogglePin: (tabID: string) => void
  onSetCustomTitle: (tabID: string, title: string | null) => void
  onSetColorID: (tabID: string, colorID: string | null) => void
  onCreateTabAdjacent: (tabID: string, side: 'left' | 'right') => void
  onDropAction: (result: DropResult) => void
}

interface TabDragState {
  isPointerDown: boolean
  draggedID: string | null
  isInSplitMode: boolean
  didSelect: boolean
  startX: number
  startY: number
  lastReorderTargetID: string | null
}

const initialDragState: TabDragState = {
  isPointerDown: false,
  draggedID: null,
  isInSplitMode: false,
  didSelect: false,
  startX: 0,
  startY: 0,
  lastReorderTargetID: null,
}

const dragActivationDistance = 4
const splitActivationDistance = 24

export function TabStrip({
  areaID,
  tabs,
  activeTabID,
  isFocused,
  projectID,
  onSelectTab,
  onCloseTab,
  onCreateTab,
  onCreateVCSTab,
  onSplit,
  onReorderTab,
  onTogglePin,
  onSetCustomTitle,
  onSetColorID,
  onCreateTabAdjacent,
  onDropAction,
}: TabStripProps): JSX.Element {
  const [dragRender, setDragRender] = useState<{
    draggedID: string | null
    isInSplitMode: boolean
  }>({ draggedID: null, isInSplitMode: false })

  const dragRef = useRef<TabDragState>({ ...initialDragState })

  const stripRef = useRef<HTMLDivElement>(null)
  const cancelDragRef = useDragStore((s) => s.cancelDrag)

  const count = Math.max(tabs.length, 1)
  const perTabWidth = Math.min(200, Math.max(44, 400 / count))

  const getTabIndexAtPoint = useCallback(
    (clientX: number): number => {
      const strip = stripRef.current
      if (!strip) return -1
      const rect = strip.getBoundingClientRect()
      const relX = clientX - rect.left
      if (relX < 0 || relX > rect.width) return -1
      return Math.min(Math.floor(relX / perTabWidth), tabs.length - 1)
    },
    [perTabWidth, tabs.length],
  )

  const handlePointerDown = useCallback(
    (_tab: TabSnapshot) => (e: React.PointerEvent) => {
      if (e.button !== 0) return
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)
      dragRef.current = {
        isPointerDown: true,
        draggedID: null,
        isInSplitMode: false,
        didSelect: false,
        startX: e.clientX,
        startY: e.clientY,
        lastReorderTargetID: null,
      }
      setDragRender({ draggedID: null, isInSplitMode: false })
    },
    [],
  )

  const handlePointerMove = useCallback(
    (tab: TabSnapshot) => (e: React.PointerEvent) => {
      if (e.buttons !== 1) return

      const d = dragRef.current
      if (!d.isPointerDown) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      const distance = Math.hypot(dx, dy)

      if (!d.didSelect) {
        onSelectTab(tab.id)
        dragRef.current = { ...d, didSelect: true }
      }

      if (d.draggedID === null) {
        if (distance < dragActivationDistance) return
        dragRef.current = { ...dragRef.current, draggedID: tab.id }
        setDragRender({ draggedID: tab.id, isInSplitMode: false })
        return
      }

      if (d.isInSplitMode) {
        useDragStore.getState().updatePosition(e.clientX, e.clientY)
        return
      }

      if (Math.abs(dy) > splitActivationDistance && !tab.isPinned) {
        const store = useDragStore.getState()
        store.beginDrag(tab.id, areaID, projectID)
        store.updatePosition(e.clientX, e.clientY)
        dragRef.current = { ...dragRef.current, isInSplitMode: true }
        setDragRender({ draggedID: tab.id, isInSplitMode: true })
        return
      }

      const targetIndex = getTabIndexAtPoint(e.clientX)
      if (targetIndex === -1) return
      const targetTab = tabs[targetIndex]
      if (!targetTab || targetTab.id === tab.id) return
      if (d.lastReorderTargetID === targetTab.id) return

      const sourceIndex = tabs.findIndex((t) => t.id === tab.id)
      if (sourceIndex === -1) return

      onReorderTab(sourceIndex, targetIndex)
      dragRef.current = { ...dragRef.current, lastReorderTargetID: targetTab.id }
    },
    [areaID, projectID, onSelectTab, onReorderTab, getTabIndexAtPoint, tabs],
  )

  const handlePointerUp = useCallback(
    (tab: TabSnapshot) => (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d.isPointerDown) return

      const target = e.currentTarget as HTMLElement
      target.releasePointerCapture(e.pointerId)

      if (!d.didSelect) {
        onSelectTab(tab.id)
      }
      if (d.isInSplitMode) {
        const result = useDragStore.getState().endDrag()
        if (result) {
          onDropAction(result)
        }
      }
      cancelDragRef()

      dragRef.current = { ...initialDragState }
      setDragRender({ draggedID: null, isInSplitMode: false })
    },
    [onSelectTab, onDropAction, cancelDragRef],
  )

  return (
    <div className="flex h-8 w-full items-center bg-[var(--nana-surface)]">
      <div ref={stripRef} className="flex flex-1 overflow-hidden">
        {tabs.map((tab, index) => (
          <TabCell
            key={tab.id}
            tab={tab}
            active={tab.id === activeTabID}
            paneFocused={isFocused}
            width={perTabWidth}
            shortcutIndex={index < 9 ? index + 1 : undefined}
            isDragging={dragRender.draggedID === tab.id}
            onPointerDown={handlePointerDown(tab)}
            onPointerMove={handlePointerMove(tab)}
            onPointerUp={handlePointerUp(tab)}
            onSelect={() => onSelectTab(tab.id)}
            onClose={() => onCloseTab(tab.id)}
            onCreateLeft={() => onCreateTabAdjacent(tab.id, 'left')}
            onCreateRight={() => onCreateTabAdjacent(tab.id, 'right')}
            onTogglePin={() => onTogglePin(tab.id)}
            onSetCustomTitle={(title) => onSetCustomTitle(tab.id, title)}
            onSetColorID={(colorID) => onSetColorID(tab.id, colorID)}
          />
        ))}
      </div>

      <div className="flex flex-shrink-0 items-center gap-0.5 pr-1">
        <TabIconButton label="Split Right" onClick={() => onSplit(areaID, 'horizontal')}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
        </TabIconButton>
        <TabIconButton label="Split Down" onClick={() => onSplit(areaID, 'vertical')}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        </TabIconButton>
        <TabIconButton label="New Tab" onClick={onCreateTab}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </TabIconButton>
        <TabIconButton label="Source Control" onClick={onCreateVCSTab}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </TabIconButton>
       </div>
    </div>
  )
}

interface TabCellProps {
  tab: TabSnapshot
  active: boolean
  paneFocused: boolean
  width: number
  shortcutIndex?: number
  isDragging: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onSelect: () => void
  onClose: () => void
  onCreateLeft: () => void
  onCreateRight: () => void
  onTogglePin: () => void
  onSetCustomTitle: (title: string | null) => void
  onSetColorID: (colorID: string | null) => void
}

function TabCell(props: TabCellProps): JSX.Element {
  const {
    tab,
    active,
    paneFocused,
    width,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onSelect,
    onClose,
    onCreateLeft,
    onCreateRight,
    onTogglePin,
    onSetCustomTitle,
    onSetColorID,
  } = props

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameText, setRenameText] = useState('')
  const [hovered, setHovered] = useState(false)
  const middleClickRef = useMiddleClick<HTMLDivElement>(onClose)

  const titleHidden = width < 80

  const tabColor = tab.colorID ? getColorForID(tab.colorID) : null
  const tabBackground = tabColor
    ? active
      ? `${tabColor}2E`
      : hovered
        ? `${tabColor}14`
        : `${tabColor}0A`
    : active
      ? 'var(--nana-hover)'
      : 'transparent'

  const bottomAccent = active && paneFocused ? tabColor ?? 'var(--nana-accent)' : tabColor ?? null

  return (
    <div
      ref={middleClickRef}
      style={{ width, opacity: isDragging ? 0.5 : 1 }}
      className="relative flex h-8 flex-shrink-0 cursor-pointer select-none items-center"
      onClick={onSelect}
      onDoubleClick={() => {
        if (!tab.isPinned) onTogglePin()
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => {
        e.preventDefault()
        const choice = window.prompt(
          `Tab: ${tab.title}\n1: Rename\n2: Pin/Unpin\n3: New Left\n4: New Right\n5: Reset Title\n6: Set Color`,
        )
        if (choice === '1') {
          setRenameText(tab.title)
          setIsRenaming(true)
        } else if (choice === '2') {
          onTogglePin()
        } else if (choice === '3') {
          onCreateLeft()
        } else if (choice === '4') {
          onCreateRight()
        } else if (choice === '5') {
          onSetCustomTitle(null)
        } else if (choice === '6') {
          const color = window.prompt('Color ID (red, blue, green):')
          onSetColorID(color ?? null)
        }
      }}
    >
      <div
        className="flex h-full w-full items-center"
        style={{
          backgroundColor: tabBackground,
          paddingLeft: titleHidden ? 0 : 12,
          paddingRight: titleHidden ? 0 : 28,
        }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <TabIcon kind={tab.kind} isPinned={tab.isPinned} />
          {isRenaming ? (
            <input
              autoFocus
              className="h-5 w-full bg-transparent text-xs text-[var(--nana-fg)] outline-none"
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              onBlur={() => {
                const trimmed = renameText.trim()
                onSetCustomTitle(trimmed ? trimmed : null)
                setIsRenaming(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const trimmed = renameText.trim()
                  onSetCustomTitle(trimmed ? trimmed : null)
                  setIsRenaming(false)
                } else if (e.key === 'Escape') {
                  setIsRenaming(false)
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : !titleHidden ? (
            <span className="truncate text-xs text-[var(--nana-fg-muted)]">{tab.title}</span>
          ) : null}
        </div>
      </div>

      {(
        <button
          className="absolute right-1 top-1/2 z-10 -translate-y-1/2 text-[var(--nana-fg-dim)] hover:text-[var(--nana-fg)]"
          style={{ display: titleHidden ? (hovered ? 'block' : 'none') : active || hovered ? 'block' : 'none' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          title="Close Tab"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {bottomAccent && (
        <div
          className="absolute bottom-0 left-0 h-0.5 w-full"
          style={{ backgroundColor: bottomAccent }}
        />
      )}

      <div
        className="absolute right-0 top-0 h-full w-px"
        style={{ backgroundColor: 'var(--nana-border)' }}
      />
    </div>
  )
}

function TabIcon({ kind, isPinned }: { kind: string; isPinned: boolean }): JSX.Element {
  const iconClass = 'text-[var(--nana-fg-dim)]'
  if (isPinned) {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <path d="M12 2l-5.5 9h11z" />
        <path d="M12 11v9" />
      </svg>
    )
  }
  const icons: Record<string, JSX.Element> = {
    terminal: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
    vcs: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    editor: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    chat: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
    browser: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    diffViewer: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    ),
    simulator: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
  }
  return icons[kind] ?? icons.terminal
}

function TabIconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      title={label}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg)]"
    >
      {children}
    </button>
  )
}

function getColorForID(id: string): string | null {
  const map: Record<string, string> = {
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
    yellow: '#eab308',
    purple: '#a855f7',
    orange: '#f97316',
  }
  return map[id] ?? null
}
