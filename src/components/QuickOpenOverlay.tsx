// Original: Muxy/Views/Components/QuickOpenOverlay.swift + PaletteOverlay.swift
// Description: Command palette overlay for file search (Cmd+P).
// Status: Completed

import { useState, useRef, useCallback } from 'react'
import { useMountEffect } from '../hooks/useMountEffect'
import { searchFiles, type FileSearchResult } from '../services/fileSearchService'

interface QuickOpenOverlayProps {
  projectPath: string
  onSelect: (absolutePath: string) => void
  onDismiss: () => void
}

export function QuickOpenOverlay({
  projectPath,
  onSelect,
  onDismiss,
}: QuickOpenOverlayProps): JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FileSearchResult[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useMountEffect(() => {
    inputRef.current?.focus()
  })

  const scrollToItem = useCallback(
    (index: number) => {
      if (scrollRef.current) {
        const items = scrollRef.current.children
        if (items[index]) {
          items[index].scrollIntoView({ block: 'nearest' })
        }
      }
    },
    [],
  )

  const performSearch = useCallback(
    (q: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      setIsSearching(true)
      searchTimeoutRef.current = setTimeout(async () => {
        const found = await searchFiles(projectPath, q)
        setResults(found)
        const nextIndex = found.length > 0 ? 0 : null
        setHighlightedIndex(nextIndex)
        if (nextIndex !== null) scrollToItem(nextIndex)
        setIsSearching(false)
      }, 50)
    },
    [projectPath, scrollToItem],
  )

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      performSearch(value)
    },
    [performSearch],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onDismiss()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => {
          const next = prev === null || prev >= results.length - 1 ? 0 : prev + 1
          scrollToItem(next)
          return next
        })
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => {
          const next = prev === null || prev <= 0 ? results.length - 1 : prev - 1
          scrollToItem(next)
          return next
        })
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightedIndex !== null && highlightedIndex < results.length) {
          onSelect(results[highlightedIndex].absolutePath)
        }
        return
      }
    },
    [results, highlightedIndex, onSelect, onDismiss, scrollToItem],
  )

  const fileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'mts': return 'TS'
      case 'js':
      case 'jsx':
      case 'mjs': return 'JS'
      case 'py': return 'PY'
      case 'json': return '{}'
      case 'html':
      case 'htm': return '<>'
      case 'css':
      case 'scss': return '#'
      case 'md':
      case 'markdown': return 'MD'
      case 'yaml':
      case 'yml':
      case 'toml': return 'Y'
      case 'sh':
      case 'bash':
      case 'zsh': return '>_'
      case 'swift': return 'Sw'
      default: return '  '
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null)

  const handleHighlightIndex = useCallback(
    (index: number) => {
      setHighlightedIndex(index)
      scrollToItem(index)
    },
    [scrollToItem],
  )

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss()
      }}
      style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
    >
      <div
        className="mt-[60px] w-[500px] max-h-[380px] flex flex-col rounded-lg shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--nana-bg)',
          border: '1px solid var(--nana-border)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
        role="dialog"
        aria-label="Quick Open"
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <svg
            width="13"
            height="13"
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
            className="flex-1 bg-transparent border-none outline-none text-[13px]"
            style={{
              color: 'var(--nana-fg)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name..."
          />
        </div>
        <div
          className="border-t"
          style={{ borderColor: 'var(--nana-border)' }}
        />
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {results.length === 0 && !isSearching ? (
            <div className="flex items-center justify-center h-full py-12">
              <span
                className="text-xs"
                style={{ color: 'var(--nana-fg-muted)' }}
              >
                {query.length === 0 ? 'No files found' : 'No matching files'}
              </span>
            </div>
          ) : (
            results.map((result, index) => {
              const highlighted = index === highlightedIndex
              return (
                <div
                  key={result.absolutePath}
                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
                  style={{
                    backgroundColor: highlighted
                      ? 'var(--nana-surface)'
                      : 'transparent',
                  }}
                  onClick={() => onSelect(result.absolutePath)}
                  onMouseEnter={() => handleHighlightIndex(index)}
                >
                  <span
                    className="text-[10px] w-6 shrink-0 text-right font-mono"
                    style={{ color: 'var(--nana-fg-muted)' }}
                  >
                    {fileIcon(result.fileName)}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-xs font-medium truncate"
                      style={{ color: 'var(--nana-fg)' }}
                    >
                      {result.fileName}
                    </span>
                    <span
                      className="text-[10px] truncate"
                      style={{ color: 'var(--nana-fg-dim)' }}
                    >
                      {result.relativePath}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
