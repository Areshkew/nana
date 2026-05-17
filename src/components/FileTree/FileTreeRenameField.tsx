// Original: Muxy/Views/FileTree/FileTreeView.swift — FileTreeRenameField
// Description: Inline text field for renaming files/folders and creating new entries.
// Status: Completed

import { useCallback, useRef } from 'react'
import { useMountEffect } from '../../hooks/useMountEffect'

interface FileTreeRenameFieldProps {
  depth: number
  initialValue: string
  isDirectory: boolean
  onCommit: (name: string) => void
  onCancel: () => void
}

export function FileTreeRenameField({
  depth,
  initialValue,
  isDirectory,
  onCommit,
  onCancel,
}: FileTreeRenameFieldProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const resolvedRef = useRef(false)

  useMountEffect(() => {
    const input = inputRef.current
    if (input) {
      input.focus()
      if (!isDirectory) {
        const dotIdx = initialValue.lastIndexOf('.')
        input.setSelectionRange(0, dotIdx > 0 ? dotIdx : initialValue.length)
      } else {
        input.select()
      }
    }
    return undefined
  })

  const resolve = useCallback(
    (forceValue?: string) => {
      if (resolvedRef.current) return
      resolvedRef.current = true
      const val = (forceValue ?? inputRef.current?.value ?? '').trim()
      if (!val || val === initialValue) {
        onCancel()
      } else {
        onCommit(val)
      }
    },
    [initialValue, onCommit, onCancel],
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
        paddingLeft: depth * 12 + 4 + (isDirectory ? 0 : 12 + 4),
        paddingRight: 4,
        height: 24,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        defaultValue={initialValue}
        className="h-5 w-full rounded border border-[var(--nana-accent)] bg-[var(--nana-bg)] px-1 text-xs outline-none"
        style={{
          color: 'var(--nana-fg)',
          fontFamily: 'var(--nana-font-ui)',
          fontSize: 12,
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  )
}
