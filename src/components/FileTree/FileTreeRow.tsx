// Original: Muxy/Views/FileTree/FileTreeView.swift — FileTreeRow
// Description: Individual file tree row — icon, name, indent, git status coloring, selection, hover.
// Status: Completed

import { useCallback, useRef, useState } from 'react'
import type { FileTreeEntry, FileStatus } from '../../stores/fileTreeStore'

interface FileTreeRowProps {
  entry: FileTreeEntry
  depth: number
  expanded: boolean
  isLoading: boolean
  status: FileStatus | null
  dirHasChanges: boolean
  isSelected: boolean
  isCut: boolean
  isDropTarget: boolean
  onClick: (entry: FileTreeEntry, e: React.MouseEvent) => void
  onDoubleClick?: (entry: FileTreeEntry) => void
  onToggle: (entry: FileTreeEntry) => void
  onContextMenu: (entry: FileTreeEntry, e: React.MouseEvent) => void
  onDragStart: (entry: FileTreeEntry, e: React.DragEvent) => void
  onDrop: (entry: FileTreeEntry, e: React.DragEvent) => void
  onDragOver: (entry: FileTreeEntry, e: React.DragEvent) => void
  onDragLeave: () => void
  children?: React.ReactNode
}

function statusColor(status: FileStatus | null, dirHasChanges: boolean): string | undefined {
  if (status === 'added' || status === 'untracked') return 'var(--nana-diff-add-fg)'
  if (status === 'deleted' || status === 'conflict') return 'var(--nana-diff-remove-fg)'
  if (status === 'modified' || status === 'renamed') return 'var(--nana-diff-hunk-fg)'
  if (dirHasChanges) return 'var(--nana-diff-hunk-fg)'
  return undefined
}

function ChevronIcon({ expanded, isLoading }: { expanded: boolean; isLoading: boolean }) {
  if (isLoading) {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 animate-spin">
        <circle cx="6" cy="6" r="4" stroke="var(--nana-fg-dim)" strokeWidth="1.5" fill="none" strokeDasharray="8 4" />
      </svg>
    )
  }
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className="shrink-0 transition-transform"
      style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
    >
      <path d="M4 2L8 6L4 10" stroke="var(--nana-fg-dim)" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function FolderIcon({ expanded }: { expanded: boolean }) {
  return expanded ? (
    <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0" fill="var(--nana-fg-dim)">
      <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5V5.5A1.5 1.5 0 0 0 14.5 4H7.707l-1.854-1.854A.5.5 0 0 0 5.5 2H1.5Z" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0" fill="var(--nana-fg-dim)">
      <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.41L1.5 3.5A2 2 0 0 1 3.31 3H9.828z" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0" fill="var(--nana-fg-dim)">
      <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM7.5 1v3.5A1.5 1.5 0 0 0 9 6h3.5L7.5 1z" />
    </svg>
  )
}

export function FileTreeRow({
  entry,
  depth,
  expanded,
  isLoading,
  status,
  dirHasChanges,
  isSelected,
  isCut,
  isDropTarget,
  onClick,
  onDoubleClick,
  onToggle,
  onContextMenu,
  onDragStart,
  onDrop,
  onDragOver,
  onDragLeave,
  children,
}: FileTreeRowProps): JSX.Element {
  const [hovered, setHovered] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClick(entry, e)
    },
    [entry, onClick],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDoubleClick?.(entry)
    },
    [entry, onDoubleClick],
  )

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggle(entry)
    },
    [entry, onToggle],
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      onContextMenu(entry, e)
    },
    [entry, onContextMenu],
  )

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      onDragStart(entry, e)
    },
    [entry, onDragStart],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onDrop(entry, e)
    },
    [entry, onDrop],
  )

  const handleDragOverEvt = useCallback(
    (e: React.DragEvent) => {
      if (!entry.isDirectory) return
      e.preventDefault()
      onDragOver(entry, e)
    },
    [entry, onDragOver],
  )

  const color = statusColor(status, dirHasChanges)
  const opacity = isCut || entry.isIgnored ? 0.45 : 1

  let bg = 'transparent'
  if (isDropTarget) bg = 'var(--nana-accent-soft)'
  else if (isSelected) bg = 'var(--nana-accent-soft)'
  else if (hovered) bg = 'var(--nana-hover)'

  return (
    <div>
      <div
        ref={rowRef}
        className="flex cursor-pointer items-center gap-1 select-none"
        style={{
          paddingLeft: depth * 12 + 4,
          paddingRight: 4,
          height: 24,
          lineHeight: '24px',
          fontSize: 12,
          background: bg,
          borderLeft: isDropTarget ? '2px solid var(--nana-accent)' : '2px solid transparent',
          opacity,
          fontFamily: 'var(--nana-font-ui)',
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        draggable={!entry.isDirectory || true}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onDragOver={handleDragOverEvt}
        onDragLeave={onDragLeave}
      >
        {entry.isDirectory ? (
          <div className="flex items-center gap-1" onClick={handleToggle}>
            <ChevronIcon expanded={expanded} isLoading={isLoading} />
            <FolderIcon expanded={expanded} />
          </div>
        ) : (
          <div className="flex items-center gap-1" style={{ paddingLeft: 12 + 4 }}>
            <FileIcon />
          </div>
        )}
        <span
          className="truncate"
          style={{ color: color ?? 'var(--nana-fg)' }}
        >
          {entry.name}
        </span>
      </div>
      {entry.isDirectory && expanded && children}
    </div>
  )
}
