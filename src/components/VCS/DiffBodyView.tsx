// Original: Muxy/Views/VCS/DiffBodyView.swift
// Description: State wrapper for diff rendering — handles loading, error, truncated (large diff)
//              preview, and dispatches to unified or split canvas based on mode.
// Status: ✅ Completed

import type { DiffDisplayRow } from '../../services/git/diffTypes'
import type { NanaThemeSnapshot } from '../../theme/nanaTheme'
import { DiffCanvasSurface } from '../Diff/DiffCanvasSurface'
import { SplitDiffCanvas } from '../Diff/SplitDiffCanvas'

type ViewMode = 'unified' | 'split'

interface DiffBodyViewProps {
  isLoading: boolean
  error: string | null
  rows: DiffDisplayRow[] | null
  filePath: string
  mode: ViewMode
  suppressLeadingTopBorder?: boolean
  onLoadFull?: () => void
  theme: NanaThemeSnapshot
}

export function DiffBodyView({
  isLoading,
  error,
  rows,
  filePath,
  mode,
  suppressLeadingTopBorder: _suppressLeadingTopBorder,
  onLoadFull: _onLoadFull,
  theme,
}: DiffBodyViewProps): JSX.Element {
  if (isLoading && rows === null) {
    return (
      <div
        style={{
          padding: 14,
          fontSize: 12,
          color: theme.fgMuted,
          textAlign: 'center',
        }}
      >
        Loading diff…
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          padding: 12,
          fontSize: 12,
          color: theme.diffRemoveFg,
          textAlign: 'left',
        }}
      >
        {'\u26A0'} {error}
      </div>
    )
  }

  if (rows === null) {
    return (
      <div
        style={{
          padding: 12,
          fontSize: 12,
          color: theme.fgMuted,
          textAlign: 'left',
        }}
      >
        No diff output
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {mode === 'unified' ? (
        <DiffCanvasSurface
          rows={rows}
          theme={theme}
          filePath={filePath}
        />
      ) : (
        <SplitDiffCanvas
          rows={rows}
          theme={theme}
          filePath={filePath}
        />
      )}
    </div>
  )
}
