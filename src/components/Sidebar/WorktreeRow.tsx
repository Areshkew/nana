// Original: Muxy/Views/Sidebar/ExpandedProjectRow.swift (ExpandedWorktreeRow)
// Description: Single worktree row in the expanded sidebar — dot, name, PRIMARY badge, branch, checkmark.
// Status: Completed

import { useState, useRef, useCallback } from 'react'
import { type Worktree, canBeRemoved } from '../../models/worktree'
import { useWorktreeStore } from '../../stores/worktreeStore'
import { useAppStore } from '../../stores/appStore'
import { useContextMenu } from '../../hooks/useContextMenu'
import {
  hasUncommittedChanges,
  removeWorktree as gitRemoveWorktree,
  deleteBranch,
} from '../../services/git/worktree'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { confirm } from '../../stores/confirmDialogStore'

interface WorktreeRowProps {
  projectID: string
  projectPath: string
  worktree: Worktree
  selected: boolean
  onSelect: () => void
}

export function WorktreeRow({ projectID, projectPath, worktree, selected, onSelect }: WorktreeRowProps): JSX.Element {
  const [hovered, setHovered] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameText, setRenameText] = useState(worktree.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const rename = useWorktreeStore((s) => s.rename)
  const remove = useWorktreeStore((s) => s.remove)
  const menuRef = useContextMenu(menuOpen, () => setMenuOpen(false))

  const displayName = worktree.isPrimary && !worktree.name ? 'main' : worktree.name
  const branchLabel =
    worktree.branch && worktree.branch.length > 0 &&
    worktree.branch.toLowerCase() !== displayName.toLowerCase()
      ? worktree.branch
      : null

  const startRename = useCallback(() => {
    setRenameText(worktree.name)
    setIsRenaming(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [worktree.name])

  const commitRename = useCallback(() => {
    const trimmed = renameText.trim()
    if (trimmed.length > 0) {
      rename(worktree.id, projectID, trimmed)
    }
    setIsRenaming(false)
  }, [rename, renameText, worktree.id, projectID])

  const cancelRename = useCallback(() => {
    setIsRenaming(false)
  }, [])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setMenuPos({ x: e.clientX, y: e.clientY })
      setMenuOpen(true)
    },
    [],
  )

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const handleRenameFromMenu = useCallback(() => {
    closeMenu()
    startRename()
  }, [closeMenu, startRename])

  const handleRemove = useCallback(async () => {
    closeMenu()
    if (!canBeRemoved(worktree)) return

    const dirty = await hasUncommittedChanges(worktree.path)
    if (dirty) {
      const confirmed = await confirm({
        title: 'Remove Worktree?',
        message: `Remove worktree "${worktree.name}"?\n\nThis worktree has uncommitted changes. Removing it will permanently discard them.`,
        confirmLabel: 'Remove',
        destructive: true,
      })
      if (!confirmed) return
    }

    // Remove from store FIRST (matches original Swift: performRemove -> worktreeStore.remove)
    // Cleanup is fire-and-forget; store removal is guaranteed.
    useAppStore.getState().removeWorktree(projectID, worktree.id)
    remove(worktree.id, projectID)

    // Best-effort disk cleanup — each step independently wrapped so one failure
    // does not block the others (matches original cleanupOnDisk pattern).
    try {
      await gitRemoveWorktree(projectPath, worktree.path, true)
    } catch (err) {
      console.warn('Git worktree remove failed:', err instanceof Error ? err.message : err)
    }

    if (worktree.ownsBranch && worktree.branch) {
      try {
        await deleteBranch(projectPath, worktree.branch, true)
      } catch (err) {
        console.warn('Branch deletion failed:', err instanceof Error ? err.message : err)
      }
    }

    try {
      await window.electronAPI.fsRemovePath(worktree.path)
    } catch (err) {
      console.warn('Filesystem cleanup failed:', err instanceof Error ? err.message : err)
    }

    // Remove parent directory if empty (matches original removeParentDirectoryIfEmpty)
    try {
      const parent = worktree.path.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
      if (parent) {
        await window.electronAPI.fsRemovePath(parent)
      }
    } catch {
      // Parent not empty or not removable — expected, ignore
    }
  }, [closeMenu, worktree, projectPath, projectID, remove])

  const bgClass = selected
    ? 'bg-blue-500/10'
    : hovered
      ? 'bg-[var(--nana-hover)]'
      : ''

  const removable = canBeRemoved(worktree)

  return (
    <>
      <div
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 cursor-pointer ${bgClass}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => { if (!isRenaming) onSelect() }}
        onContextMenu={handleContextMenu}
        onDoubleClick={startRename}
        role="button"
        aria-selected={selected}
        aria-label={worktree.isPrimary ? `${displayName}, primary` : displayName}
      >
        <div
          className={`h-[5px] w-[5px] shrink-0 rounded-full ${selected ? 'bg-blue-400' : 'bg-[var(--nana-fg-dim)]'}`}
        />

        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') cancelRename()
            }}
            onBlur={commitRename}
            className="min-w-0 flex-1 border-b border-[var(--nana-border)] bg-transparent text-xs font-medium text-[var(--nana-fg)] outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span
                className={`truncate text-[11px] leading-tight ${
                  selected ? 'font-semibold text-[var(--nana-fg)]' : 'font-normal text-[var(--nana-fg-muted)]'
                }`}
              >
                {displayName}
              </span>
              {worktree.isPrimary && (
                <span className="shrink-0 rounded-full bg-[var(--nana-surface)] px-1.5 py-px text-[8px] font-bold tracking-wide text-[var(--nana-fg-dim)]">
                  PRIMARY
                </span>
              )}
            </div>
            {branchLabel && (
              <span className="block truncate font-mono text-[9px] leading-tight text-[var(--nana-fg-dim)]">
                {branchLabel}
              </span>
            )}
          </div>
        )}

        {selected && !isRenaming && (
          <Check size={10} className="shrink-0 text-blue-400" strokeWidth={3} />
        )}
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} onPointerDown={(e) => e.stopPropagation()} />
          <div
            ref={menuRef}
            className="fixed z-50 min-w-[140px] rounded-md border border-[var(--nana-border)] bg-[var(--nana-bg)] py-1 shadow-xl"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            {worktree.isPrimary ? (
              <div className="px-3 py-1.5 text-[11px] text-[var(--nana-fg-dim)]">
                Primary worktree
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleRenameFromMenu}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-[var(--nana-fg)] hover:bg-[var(--nana-hover)]"
                >
                  <Pencil size={10} className="text-[var(--nana-fg-dim)]" />
                  Rename
                </button>
                <div className="my-1 h-px bg-[var(--nana-border)]" />
                {removable ? (
                  <button
                    type="button"
                    onClick={() => void handleRemove()}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-red-400 hover:bg-[var(--nana-hover)]"
                  >
                    <Trash2 size={10} className="text-red-400/70" />
                    Delete
                  </button>
                ) : (
                  <div className="px-3 py-1.5 text-[11px] text-[var(--nana-fg-dim)]">
                    External worktree
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
