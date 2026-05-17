// Original: Muxy/Views/FileTree/FileTreeView.swift — FileTreeContextMenuContents
// Description: Right-click context menu for file tree — new file/folder, rename, delete, copy paths, reveal, terminal.
// Status: Completed

import { useCallback } from 'react'
import { useMountEffect } from '../../hooks/useMountEffect'
import type { FileTreeEntry } from '../../services/virtualization/treeFlattener'
import type { FileTreeStoreApi } from '../../stores/fileTreeStore'
import { PendingEntryKind as PEK } from '../../stores/fileTreeStore'

interface FileTreeContextMenuProps {
  x: number
  y: number
  entry: FileTreeEntry | null
  store: FileTreeStoreApi
  onClose: () => void
  onOpenTerminal?: (directoryPath: string) => void
}

export function FileTreeContextMenu({
  x,
  y,
  entry,
  store,
  onClose,
  onOpenTerminal,
}: FileTreeContextMenuProps): JSX.Element {
  const state = store.getState()
  const hasTarget = entry !== null
  const selectedPaths = state.selectedPaths
  const multiCount = hasTarget && selectedPaths.has(entry.absolutePath) && selectedPaths.size > 1
    ? selectedPaths.size
    : 0

  const resolveDir = useCallback((): string => {
    if (!entry) return state.rootPath
    if (entry.isDirectory) return entry.absolutePath
    return entry.absolutePath.split(/[/\\]/).slice(0, -1).join('/') || state.rootPath
  }, [entry, state.rootPath])

  useMountEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function handleClick(e: MouseEvent) {
      const menu = document.getElementById('file-tree-ctx')
      if (menu && !menu.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  })

  const handleNewFile = useCallback(() => {
    store.getState().beginNewEntry(resolveDir(), PEK.File)
    onClose()
  }, [resolveDir, store, onClose])

  const handleNewFolder = useCallback(() => {
    store.getState().beginNewEntry(resolveDir(), PEK.Folder)
    onClose()
  }, [resolveDir, store, onClose])

  const handleRename = useCallback(() => {
    if (!entry) return
    store.getState().setPendingRename(entry.absolutePath)
    onClose()
  }, [entry, store, onClose])

  const handleDelete = useCallback(() => {
    if (!entry) return
    const paths = multiCount > 0
      ? [...selectedPaths]
      : [entry.absolutePath]
    store.getState().setPendingDeletePaths(paths)
    void window.electronAPI.fileTreeTrash(paths).then(() => {
      const parent = entry.absolutePath.split(/[/\\]/).slice(0, -1).join('/')
      if (parent) store.getState().refreshDirectory(parent)
      store.getState().clearPendingDelete()
      store.getState().clearSelection()
    })
    onClose()
  }, [entry, multiCount, selectedPaths, store, onClose])

  const handleCopyPath = useCallback(() => {
    if (!entry) return
    void window.electronAPI.clipboardWriteText(entry.absolutePath)
    onClose()
  }, [entry, onClose])

  const handleCopyRelPath = useCallback(() => {
    if (!entry) return
    void window.electronAPI.clipboardWriteText(entry.relativePath)
    onClose()
  }, [entry, onClose])

  const handleReveal = useCallback(() => {
    if (!entry) return
    void window.electronAPI.fileTreeRevealInFinder(entry.absolutePath)
    onClose()
  }, [entry, onClose])

  const handleOpenTerminal = useCallback(() => {
    if (!entry || !onOpenTerminal) return
    const dir = entry.isDirectory
      ? entry.absolutePath
      : entry.absolutePath.split(/[/\\]/).slice(0, -1).join('/')
    onOpenTerminal(dir)
    onClose()
  }, [entry, onOpenTerminal, onClose])

  const btn = 'flex w-full px-3 py-1.5 text-left text-xs text-[var(--nana-fg)] hover:bg-[var(--nana-hover)] disabled:opacity-40 disabled:pointer-events-none'
  const sep = 'my-1 border-t border-[var(--nana-border)]'

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} />
      <div
        id="file-tree-ctx"
        className="fixed z-50 min-w-[160px] rounded-lg border border-[var(--nana-border)] bg-[var(--nana-bg)] py-1 shadow-xl"
        style={{ left: x, top: y }}
      >
        <button type="button" className={btn} onClick={handleNewFile}>New File</button>
        <button type="button" className={btn} onClick={handleNewFolder}>New Folder</button>

        {hasTarget && (
          <>
            <div className={sep} />
            <button type="button" className={btn} onClick={handleRename} disabled={multiCount > 0}>Rename</button>
            <button
              type="button"
              className="flex w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-[var(--nana-hover)]"
              onClick={handleDelete}
            >
              {multiCount > 0 ? `Delete ${multiCount} Items` : 'Delete'}
            </button>
          </>
        )}

        <div className={sep} />
        <button type="button" className={btn} onClick={handleCopyPath} disabled={!hasTarget}>Copy Path</button>
        <button type="button" className={btn} onClick={handleCopyRelPath} disabled={!hasTarget}>Copy Relative Path</button>

        <div className={sep} />
        <button type="button" className={btn} onClick={handleReveal} disabled={!hasTarget}>Reveal in Finder</button>
        <button type="button" className={btn} onClick={handleOpenTerminal} disabled={!hasTarget || !onOpenTerminal}>Open in Terminal</button>
      </div>
    </>
  )
}
