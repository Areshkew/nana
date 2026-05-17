// Original: Muxy/Views/FileTree/FileTreeView.swift — FileTreeView + FileTreeRowGroup
// Description: File tree panel with header, virtualized flat list, toggle, selection, context menu.
// Status: Completed

import { useCallback, useRef, useMemo } from 'react'
import type { FileTreeStoreApi } from '../../stores/fileTreeStore'
import { PendingEntryKind } from '../../stores/fileTreeStore'
import { FileTreeRow } from './FileTreeRow'
import { FileTreeContextMenu } from './FileTreeContextMenu'
import { FileTreeRenameField } from './FileTreeRenameField'
import { FileTreeNewEntryRow } from './FileTreeNewEntryRow'
import { useState } from 'react'
import type { FileTreeEntry } from '../../services/virtualization/treeFlattener'

interface FileTreeViewProps {
  store: FileTreeStoreApi
  repoPath: string
  onOpenFile?: (filePath: string, pin: boolean) => void
  onOpenTerminal?: (directoryPath: string) => void
}

export function FileTreeView({ store, repoPath, onOpenFile, onOpenTerminal }: FileTreeViewProps): JSX.Element {
  const flattenedRows = store((s) => s.flattenedRows)
  const expanded = store((s) => s.expanded)
  const loadingPaths = store((s) => s.loadingPaths)
  const statuses = store((s) => s.statuses)
  const dirHasChange = store((s) => s.dirHasChange)
  const showOnlyChanges = store((s) => s.showOnlyChanges)
  const selectedPaths = store((s) => s.selectedPaths)
  const cutPaths = store((s) => s.cutPaths)
  const dropHighlightPath = store((s) => s.dropHighlightPath)
  const pendingRenamePath = store((s) => s.pendingRenamePath)
  const pendingNewEntry = store((s) => s.pendingNewEntry)

  const loadRootIfNeeded = store((s) => s.loadRootIfNeeded)
  const toggle = store((s) => s.toggle)
  const selectOnly = store((s) => s.selectOnly)
  const toggleSelection = store((s) => s.toggleSelection)
  const extendSelection = store((s) => s.extendSelection)
  const clearSelection = store((s) => s.clearSelection)
  const setShowOnlyChanges = store((s) => s.setShowOnlyChanges)
  const setPendingRename = store((s) => s.setPendingRename)
  const refreshDirectory = store((s) => s.refreshDirectory)
  const setDropHighlight = store((s) => s.setDropHighlight)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    entry: FileTreeEntry | null
  } | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const hasLoadedRef = useRef(false)
  const projectName = repoPath.split(/[/\\]/).filter(Boolean).pop() ?? 'Project'

  if (!hasLoadedRef.current) {
    hasLoadedRef.current = true
    loadRootIfNeeded()
  }

  const handleClick = useCallback(
    (entry: FileTreeEntry, e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey) {
        toggleSelection(entry.absolutePath)
      } else if (e.shiftKey) {
        extendSelection(entry.absolutePath)
      } else {
        selectOnly(entry.absolutePath)
        if (entry.isDirectory) {
          toggle(entry)
        } else if (!entry.absolutePath.includes(' (deleted)')) {
          onOpenFile?.(entry.absolutePath, false)
        }
      }
    },
    [toggleSelection, extendSelection, selectOnly, toggle, onOpenFile],
  )

  const handleDoubleClick = useCallback(
    (entry: FileTreeEntry) => {
      if (entry.isDirectory) return
      if (entry.absolutePath.includes(' (deleted)')) return
      onOpenFile?.(entry.absolutePath, true)
    },
    [onOpenFile],
  )

  const handleToggle = useCallback(
    (entry: FileTreeEntry) => {
      toggle(entry)
    },
    [toggle],
  )

  const handleContextMenu = useCallback(
    (entry: FileTreeEntry | null, e: React.MouseEvent) => {
      setContextMenu({ x: e.clientX, y: e.clientY, entry })
    },
    [],
  )

  const handleBackgroundClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  const handleBackgroundContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, entry: null })
    },
    [],
  )

  const handleDragStart = useCallback(
    (entry: FileTreeEntry, e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', entry.absolutePath)
      e.dataTransfer.effectAllowed = 'move'
    },
    [],
  )

  const handleDragOver = useCallback(
    (entry: FileTreeEntry, _e: React.DragEvent) => {
      setDropHighlight(entry.absolutePath)
    },
    [setDropHighlight],
  )

  const handleDrop = useCallback(
    (entry: FileTreeEntry, e: React.DragEvent) => {
      setDropHighlight(null)
      if (!entry.isDirectory) return
      const sourcePaths = e.dataTransfer.getData('text/plain')
      if (!sourcePaths) return
      const sources = [sourcePaths]
      void window.electronAPI.fileTreeMove(sources, entry.absolutePath).then(() => {
        refreshDirectory(entry.absolutePath)
        const parent = repoPath.split(/[/\\]/).slice(0, -1).join('/')
        if (parent) refreshDirectory(parent)
      })
    },
    [setDropHighlight, refreshDirectory, repoPath],
  )

  const handleDragLeave = useCallback(() => {
    setDropHighlight(null)
  }, [setDropHighlight])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleRename = useCallback(
    (newName: string) => {
      if (!pendingRenamePath) return
      void window.electronAPI.fileTreeRename(pendingRenamePath, newName).then(() => {
        const parent = pendingRenamePath.split(/[/\\]/).slice(0, -1).join('/')
        if (parent) refreshDirectory(parent)
        setPendingRename(null)
      }).catch(() => {
        setPendingRename(null)
      })
    },
    [pendingRenamePath, refreshDirectory, setPendingRename],
  )

  const handleNewEntry = useCallback(
    (name: string) => {
      if (!pendingNewEntry) return
      const { parentPath, kind } = pendingNewEntry
      const op = kind === PendingEntryKind.File
        ? window.electronAPI.fileTreeCreateFile
        : window.electronAPI.fileTreeCreateFolder
      void op(name, parentPath).then(() => {
        refreshDirectory(parentPath)
      })
    },
    [pendingNewEntry, refreshDirectory],
  )

  const rows = useMemo(() => {
    const result: JSX.Element[] = []
    for (const row of flattenedRows) {
      const isDir = row.entry.isDirectory
      const isExpanded = expanded.has(row.entry.absolutePath)
      const isLoading = loadingPaths.has(row.entry.absolutePath)
      const status = statuses.get(row.entry.absolutePath) ?? null
      const hasDirChanges = dirHasChange.has(row.entry.absolutePath)
      const isSelected = selectedPaths.has(row.entry.absolutePath)
      const isCut = cutPaths.has(row.entry.absolutePath)
      const isDropTarget = dropHighlightPath === row.entry.absolutePath

      const isRenaming = pendingRenamePath === row.entry.absolutePath

      if (isRenaming) {
        result.push(
          <FileTreeRenameField
            key={row.key}
            depth={row.depth}
            initialValue={row.entry.name}
            isDirectory={isDir}
            onCommit={handleRename}
            onCancel={() => setPendingRename(null)}
          />,
        )
        continue
      }

      result.push(
        <FileTreeRow
          key={row.key}
          entry={row.entry}
          depth={row.depth}
          expanded={isExpanded}
          isLoading={isLoading}
          status={status}
          dirHasChanges={hasDirChanges}
          isSelected={isSelected}
          isCut={isCut}
          isDropTarget={isDropTarget}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onToggle={handleToggle}
          onContextMenu={(entry, e) => handleContextMenu(entry, e)}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        />,
      )
    }
    return result
  }, [
    flattenedRows, expanded, loadingPaths, statuses, dirHasChange,
    selectedPaths, cutPaths, dropHighlightPath, pendingRenamePath,
    handleClick, handleDoubleClick, handleToggle, handleContextMenu, handleDragStart,
    handleDrop, handleDragOver, handleDragLeave, handleRename, setPendingRename,
  ])

  const newEntryRow = pendingNewEntry ? (
    <FileTreeNewEntryRow
      key={pendingNewEntry.token}
      parentDepth={
        flattenedRows.find(
          (r) => r.entry.absolutePath === pendingNewEntry.parentPath,
        )?.depth ?? -1
      }
      kind={pendingNewEntry.kind}
      onCommit={handleNewEntry}
      onCancel={() => store.getState().cancelNewEntry()}
    />
  ) : null

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--nana-bg)' }}>
      <div
        className="flex shrink-0 items-center justify-between border-b border-[var(--nana-border)]"
        style={{ height: 32, paddingLeft: 8, paddingRight: 4 }}
      >
        <span
          className="truncate text-xs font-medium"
          style={{ color: 'var(--nana-fg-muted)', fontFamily: 'var(--nana-font-ui)' }}
        >
          {projectName}
        </span>
        <button
          className="flex h-6 w-6 items-center justify-center rounded"
          style={{ color: showOnlyChanges ? 'var(--nana-accent)' : 'var(--nana-fg-dim)' }}
          onClick={() => setShowOnlyChanges(!showOnlyChanges)}
          title="Show only changed files"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
          </svg>
        </button>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ fontFamily: 'var(--nana-font-ui)' }}
        onClick={handleBackgroundClick}
        onContextMenu={handleBackgroundContextMenu}
      >
        {rows.length === 0 && (
          <div
            className="flex items-center justify-center py-8 text-xs"
            style={{ color: 'var(--nana-fg-dim)' }}
          >
            {showOnlyChanges ? 'No changes' : 'Empty directory'}
          </div>
        )}
        {rows}
        {newEntryRow}
      </div>
      {contextMenu && (
        <FileTreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          entry={contextMenu.entry}
          store={store}
          onClose={closeContextMenu}
          onOpenTerminal={onOpenTerminal}
        />
      )}
    </div>
  )
}
