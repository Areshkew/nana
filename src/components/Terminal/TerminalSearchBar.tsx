// Original: Muxy/Views/Terminal/TerminalSearchBar.swift
// Description: Search bar overlay for in-terminal find with next/prev navigation.
// Status: Completed

import { useState, useRef, useCallback } from 'react'
import { useMountEffect } from '../../hooks/useMountEffect'
import { useTerminalSearchStore } from '../../stores/terminalSearchStore'

interface TerminalSearchBarProps {
  paneId: string
  onFindNext: (needle: string) => void
  onFindPrevious: (needle: string) => void
  onClose: () => void
}

export function TerminalSearchBar({
  paneId,
  onFindNext,
  onFindPrevious,
  onClose,
}: TerminalSearchBarProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const searchState = useTerminalSearchStore((s) => s.searchStates[paneId])
  const [localNeedle, setLocalNeedle] = useState(searchState?.needle ?? '')

  const total = searchState?.total ?? null
  const selected = searchState?.selected ?? null

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const displayText = (() => {
    if (total === null) return ''
    if (selected === null) return `${total} matches`
    return `${selected} of ${total}`
  })()

  useMountEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  })

  const handleChange = useCallback(
    (value: string) => {
      setLocalNeedle(value)
      useTerminalSearchStore.getState().setSearchNeedle(paneId, value)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (value.length === 0 || value.length >= 3) {
        onFindNext(value)
      } else {
        debounceRef.current = setTimeout(() => {
          onFindNext(value)
        }, 300)
      }
    },
    [paneId, onFindNext],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          onFindPrevious(localNeedle)
        } else {
          onFindNext(localNeedle)
        }
        return
      }
    },
    [localNeedle, onFindNext, onFindPrevious, onClose],
  )

  return (
    <div
      className="absolute top-0 left-0 right-0 z-50"
      data-search-bar
      style={{
        background: 'var(--nana-bg)',
        opacity: 0.95,
        borderBottom: '1px solid var(--nana-border)',
      }}
    >
      <div className="flex items-center gap-1.5 px-2 h-8">
        <div
          className="flex items-center gap-1 flex-1 px-2 py-1 rounded-md border"
          style={{
            background: 'var(--nana-surface)',
            borderColor: 'var(--nana-border)',
          }}
        >
          <svg
            className="shrink-0"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--nana-fg-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-xs"
            style={{
              color: 'var(--nana-fg)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            value={localNeedle}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search"
          />
          {displayText && (
            <span
              className="text-[10px] shrink-0 select-none"
              style={{ color: 'var(--nana-fg-muted)' }}
              aria-label={`Search results: ${displayText}`}
            >
              {displayText}
            </span>
          )}
        </div>

        <button
          className="flex items-center justify-center w-[22px] h-[22px] rounded"
          style={{ color: 'var(--nana-fg-muted)' }}
          onClick={() => onFindPrevious(localNeedle)}
          aria-label="Previous Match"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>

        <button
          className="flex items-center justify-center w-[22px] h-[22px] rounded"
          style={{ color: 'var(--nana-fg-muted)' }}
          onClick={() => onFindNext(localNeedle)}
          aria-label="Next Match"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <button
          className="flex items-center justify-center w-[22px] h-[22px] rounded"
          style={{ color: 'var(--nana-fg-muted)' }}
          onClick={onClose}
          aria-label="Close Search"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
