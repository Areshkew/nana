// Original: Muxy/Views/Terminal/TerminalPane.swift
// Description: Terminal wrapper UI — full-bleed container for the xterm surface with search bar overlay.
// Status: Completed

import { lazy, Suspense, useRef, useCallback } from 'react'
import { useTerminalSearchStore } from '../../stores/terminalSearchStore'
import { TerminalSearchBar } from './TerminalSearchBar'
import type { XTermSurfaceHandle } from './XTermSurface'

const XTermSurface = lazy(() =>
  import('./XTermSurface').then((m) => ({ default: m.XTermSurface })),
)

interface TerminalPaneProps {
  paneId: string
  cwd?: string
  focused?: boolean
  visible?: boolean
  startupCommand?: string
  onFocus?: () => void
  onTitleChange?: (title: string) => void
  onProcessExit?: () => void
}

export function TerminalPane({
  paneId,
  cwd,
  focused = true,
  visible = true,
  startupCommand,
  onFocus,
  onTitleChange,
  onProcessExit,
}: TerminalPaneProps): JSX.Element {
  const surfaceRef = useRef<XTermSurfaceHandle>(null)
  const searchVisible = useTerminalSearchStore(
    (s) => s.searchStates[paneId]?.isVisible ?? false,
  )

  const handleFindNext = useCallback(
    (needle: string) => {
      if (needle === '') {
        surfaceRef.current?.clearSearch()
        useTerminalSearchStore.getState().setSearchResult(paneId, null, null)
      } else {
        surfaceRef.current?.searchNext(needle)
      }
    },
    [paneId],
  )

  const handleFindPrevious = useCallback(
    (needle: string) => {
      if (needle === '') return
      surfaceRef.current?.searchPrevious(needle)
    },
    [],
  )

  const handleCloseSearch = useCallback(() => {
    surfaceRef.current?.clearSearch()
    useTerminalSearchStore.getState().setSearchVisible(paneId, false)
    useTerminalSearchStore.getState().setSearchResult(paneId, null, null)
    useTerminalSearchStore.getState().setSearchNeedle(paneId, '')
  }, [paneId])

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-search-bar]')) return
      surfaceRef.current?.focus()
      onFocus?.()
    },
    [onFocus],
  )

  return (
    <div
      className="h-full w-full bg-[var(--nana-bg)] relative"
      style={{ visibility: visible ? 'visible' : 'hidden' }}
      onClick={handleContainerClick}
    >
      {searchVisible && (
        <TerminalSearchBar
          paneId={paneId}
          onFindNext={handleFindNext}
          onFindPrevious={handleFindPrevious}
          onClose={handleCloseSearch}
        />
      )}
      <Suspense fallback={null}>
        <XTermSurface
          ref={surfaceRef}
          paneId={paneId}
          cwd={cwd}
          focused={focused}
          visible={visible}
          startupCommand={startupCommand}
          onTitleChange={onTitleChange}
          onProcessExit={onProcessExit}
        />
      </Suspense>
    </div>
  )
}
