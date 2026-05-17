// Original: Muxy/Views/Editor/EditorSearchBar.swift
// Description: Find/replace overlay for the editor. Matches terminal search bar visual style.
//              Supports case-sensitive, regex, replace, replace-all.
// Status: 🚧 In progress

import { useState, useRef, useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import { SearchQuery, replaceNext, replaceAll, findNext, findPrevious, setSearchQuery } from '@codemirror/search'
import { useEditorStore } from '../../stores/editorStore'
import { getSearchState, setSearchState as saveSearchState } from './editorSearchHelpers'

interface SearchState {
  needle: string
  replaceText: string
  caseSensitive: boolean
  useRegex: boolean
  replaceVisible: boolean
  matchCount: number
  currentIndex: number
  invalidRegex: boolean
}

interface EditorSearchBarProps {
  tabId: string
}

export function EditorSearchBar({ tabId }: EditorSearchBarProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const hideSearch = useEditorStore((s) => s.hideSearch)
  const [searchState, setSearchState] = useState<SearchState>(() => getSearchState(tabId))
  const [revision, setRevision] = useState(0)
  const viewRef = useRef<EditorView | null>(null)

  const getView = useCallback((): EditorView | null => {
    if (viewRef.current) return viewRef.current
    const el = document.querySelector<HTMLElement>(`[data-editor-tab="${tabId}"] .cm-editor`)
    if (el) {
      viewRef.current = EditorView.findFromDOM(el)
    }
    return viewRef.current
  }, [tabId])

  const updateSearch = useCallback(
    (view: EditorView, needle: string, caseSensitive: boolean, useRegex: boolean) => {
      if (!needle) {
        const emptyQuery: SearchQuery = new SearchQuery({ search: '' })
        view.dispatch({ effects: setSearchQuery.of(emptyQuery) })
        return
      }

      const query: SearchQuery = useRegex
        ? new SearchQuery({ search: needle, caseSensitive, regexp: true })
        : new SearchQuery({ search: needle, caseSensitive })
      view.dispatch({ effects: setSearchQuery.of(query) })
    },
    [],
  )

  const performSearch = useCallback(
    (updates: Partial<SearchState>) => {
      const current = getSearchState(tabId)
      const next = { ...current, ...updates }
      saveSearchState(tabId, next)
      setSearchState(next)
      setRevision((r) => r + 1)

      const view = getView()
      if (!view) return

      updateSearch(view, next.needle, next.caseSensitive, next.useRegex)
    },
    [tabId, updateSearch, getView],
  )

  const handleClose = useCallback(() => {
    hideSearch(tabId)
    const view = getView()
    if (view) {
      const emptyQuery: SearchQuery = new SearchQuery({ search: '' })
      view.dispatch({ effects: setSearchQuery.of(emptyQuery) })
    }
  }, [tabId, hideSearch, getView])

  const handleFindNext = useCallback(() => {
    const view = getView()
    if (view) findNext(view)
  }, [getView])

  const handleFindPrevious = useCallback(() => {
    const view = getView()
    if (view) findPrevious(view)
  }, [getView])

  const handleReplaceCurrent = useCallback(() => {
    const view = getView()
    if (view) replaceNext(view)
  }, [getView])

  const handleReplaceAll = useCallback(() => {
    const view = getView()
    if (view) replaceAll(view)
  }, [getView])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          handleFindPrevious()
        } else {
          handleFindNext()
        }
        return
      }
    },
    [handleClose, handleFindNext, handleFindPrevious],
  )

  void revision

  return (
    <div
      className="shrink-0"
      style={{
        background: 'var(--nana-bg)',
        opacity: 0.95,
        borderBottom: '1px solid var(--nana-border)',
      }}
    >
      <div className="flex items-start gap-1.5 px-2 py-1.5">
        <button
          className="flex items-center justify-center w-[22px] h-[22px] rounded shrink-0 mt-[1px]"
          style={{ color: 'var(--nana-fg-muted)' }}
          onClick={() => performSearch({ replaceVisible: !searchState.replaceVisible })}
          aria-label={searchState.replaceVisible ? 'Hide Replace' : 'Show Replace'}
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
            {searchState.replaceVisible ? (
              <path d="m18 15-6-6-6 6" />
            ) : (
              <path d="m9 18 6-6-6-6" />
            )}
          </svg>
        </button>

        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1 flex-1 px-2 py-1 rounded-md border"
              style={{
                background: 'var(--nana-surface)',
                borderColor: searchState.invalidRegex ? '#f38ba8' : 'var(--nana-border)',
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
                autoFocus
                className="flex-1 bg-transparent border-none outline-none text-xs min-w-0"
                style={{
                  color: 'var(--nana-fg)',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
                value={searchState.needle}
                onChange={(e) => {
                  const needle = e.target.value
                  let invalidRegex = false
                  if (searchState.useRegex && needle) {
                    try {
                      new RegExp(needle)
                    } catch {
                      invalidRegex = true
                    }
                  }
                  performSearch({ needle, invalidRegex })
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search"
              />
              <button
                className="flex items-center justify-center rounded shrink-0 text-[10px] font-semibold"
                style={{
                  width: 20,
                  height: 18,
                  fontFamily: 'monospace',
                  color: searchState.caseSensitive ? 'var(--nana-fg)' : 'var(--nana-fg-muted)',
                  background: searchState.caseSensitive ? 'var(--nana-border)' : 'transparent',
                }}
                onClick={() => performSearch({ caseSensitive: !searchState.caseSensitive })}
                aria-label="Match Case"
              >
                Aa
              </button>
              <button
                className="flex items-center justify-center rounded shrink-0 text-[10px] font-semibold"
                style={{
                  width: 20,
                  height: 18,
                  fontFamily: 'monospace',
                  color: searchState.useRegex ? 'var(--nana-fg)' : 'var(--nana-fg-muted)',
                  background: searchState.useRegex ? 'var(--nana-border)' : 'transparent',
                }}
                onClick={() => performSearch({ useRegex: !searchState.useRegex })}
                aria-label="Regular Expression"
              >
                .*
              </button>
            </div>

            <button
              className="flex items-center justify-center w-[22px] h-[22px] rounded shrink-0"
              style={{ color: 'var(--nana-fg-muted)' }}
              onClick={handleFindPrevious}
              aria-label="Previous Match"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m18 15-6-6-6 6" />
              </svg>
            </button>

            <button
              className="flex items-center justify-center w-[22px] h-[22px] rounded shrink-0"
              style={{ color: 'var(--nana-fg-muted)' }}
              onClick={handleFindNext}
              aria-label="Next Match"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <button
              className="flex items-center justify-center w-[22px] h-[22px] rounded shrink-0"
              style={{ color: 'var(--nana-fg-muted)' }}
              onClick={handleClose}
              aria-label="Close Search"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {searchState.replaceVisible && (
            <div className="flex items-center gap-1.5">
              <div
                className="flex items-center gap-1 flex-1 px-2 py-1 rounded-md border"
                style={{ background: 'var(--nana-surface)', borderColor: 'var(--nana-border)' }}
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
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <input
                  type="text"
                  className="flex-1 bg-transparent border-none outline-none text-xs min-w-0"
                  style={{
                    color: 'var(--nana-fg)',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                  value={searchState.replaceText}
                  onChange={(e) => performSearch({ replaceText: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleReplaceCurrent()
                    }
                  }}
                  placeholder="Replace"
                />
              </div>

              <button
                className="flex items-center justify-center h-[22px] px-2 rounded text-[11px] font-medium shrink-0"
                style={{
                  color: 'var(--nana-fg)',
                  background: 'var(--nana-bg)',
                  border: '1px solid var(--nana-border)',
                }}
                onClick={handleReplaceCurrent}
              >
                Replace
              </button>

              <button
                className="flex items-center justify-center h-[22px] px-2 rounded text-[11px] font-medium shrink-0"
                style={{
                  color: 'var(--nana-fg)',
                  background: 'var(--nana-bg)',
                  border: '1px solid var(--nana-border)',
                }}
                onClick={handleReplaceAll}
              >
                All
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
