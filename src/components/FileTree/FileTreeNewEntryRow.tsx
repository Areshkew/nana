// Original: Muxy/Views/FileTree/FileTreeView.swift — FileTreeNewEntryRow
// Description: Inline row for creating new files or folders within the tree.
// Status: Completed

import { useCallback, useRef } from 'react'
import { useMountEffect } from '../../hooks/useMountEffect'
import { PendingEntryKind } from '../../stores/fileTreeStore'

interface FileTreeNewEntryRowProps {
  parentDepth: number
  kind: PendingEntryKind
  onCommit: (name: string) => void
  onCancel: () => void
}

export function FileTreeNewEntryRow({
  parentDepth,
  kind,
  onCommit,
  onCancel,
}: FileTreeNewEntryRowProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const resolvedRef = useRef(false)

  const depth = parentDepth + 1

  useMountEffect(() => {
    const input = inputRef.current
    if (input) input.focus()
    return undefined
  })

  const resolve = useCallback(
    (forceValue?: string) => {
      if (resolvedRef.current) return
      resolvedRef.current = true
      const val = (forceValue ?? inputRef.current?.value ?? '').trim()
      if (!val) {
        onCancel()
      } else {
        onCommit(val)
      }
    },
    [onCommit, onCancel],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        resolve()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        resolvedRef.current = true
        onCancel()
      }
    },
    [resolve, onCancel],
  )

  const handleBlur = useCallback(() => {
    resolve()
  }, [resolve])

  return (
    <div
      className="flex items-center gap-1"
      style={{
        paddingLeft: depth * 12 + 4,
        paddingRight: 4,
        height: 24,
      }}
    >
      {kind === PendingEntryKind.Folder ? (
        <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0" fill="var(--nana-fg-dim)">
          <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5V5.5A1.5 1.5 0 0 0 14.5 4H7.707l-1.854-1.854A.5.5 0 0 0 5.5 2H1.5Z" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0" fill="var(--nana-fg-dim)">
          <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM7.5 1v3.5A1.5 1.5 0 0 0 9 6h3.5L7.5 1z" />
        </svg>
      )}
      <input
        ref={inputRef}
        type="text"
        className="h-5 w-full rounded border border-[var(--nana-accent)] bg-[var(--nana-bg)] px-1 text-xs outline-none"
        style={{
          color: 'var(--nana-fg)',
          fontFamily: 'var(--nana-font-ui)',
          fontSize: 12,
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={kind === PendingEntryKind.Folder ? 'folder name' : 'file name'}
      />
    </div>
  )
}
