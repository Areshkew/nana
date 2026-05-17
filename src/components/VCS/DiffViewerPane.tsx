// Original: Muxy/Views/VCS/DiffViewerPane.swift
// Description: Standalone diff viewer tab pane with breadcrumb header (file path,
//              staged badge, +/- counts, mode toggle, refresh button) and scrollable
//              diff body.
// Status: ✅ Completed

import { DiffBodyView } from './DiffBodyView'
import { useVCSStore } from '../../stores/vcsStore'
import { useThemeStore } from '../../stores/themeStore'
import { useMountEffect } from '../../hooks/useMountEffect'

interface DiffViewerPaneProps {
  repoPath: string
  filePath: string
  isStaged: boolean
}

function ModeToggle({ mode, onToggle }: { mode: 'unified' | 'split'; onToggle: (m: 'unified' | 'split') => void }): JSX.Element {
  const theme = useThemeStore((s) => s.snapshot)
  if (!theme) return <></>

  return (
    <div
      style={{
        display: 'flex',
        background: theme.surface,
        borderRadius: 5,
        border: `1px solid ${theme.border}`,
        overflow: 'hidden',
      }}
    >
      {(['split', 'unified'] as const).map((m) => {
        const selected = mode === m
        const label = m === 'unified' ? 'Unified' : 'Split'
        return (
          <button
            key={m}
            onClick={() => onToggle(m)}
            style={{
              width: 22,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: selected ? theme.bg : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: selected ? theme.fg : theme.fgMuted,
              fontSize: 10,
              fontWeight: 600,
              padding: 0,
            }}
            title={label}
          >
            {m === 'unified' ? '☰' : '⊞'}
          </button>
        )
      })}
    </div>
  )
}

export function DiffViewerPane({
  repoPath,
  filePath,
  isStaged,
}: DiffViewerPaneProps): JSX.Element {
  const theme = useThemeStore((s) => s.snapshot)
  const diff = useVCSStore((s) => s.getCachedDiff(repoPath, filePath))
  const loading = useVCSStore((s) => s.isLoadingDiff(repoPath, filePath))
  const error = useVCSStore((s) => s.getDiffError(repoPath, filePath)) ?? null
  const mode = useVCSStore((s) => s.mode)
  const setMode = useVCSStore((s) => s.setMode)
  const loadDiff = useVCSStore((s) => s.loadDiff)

  useMountEffect(() => {
    if (!diff && !loading && !error) {
      void loadDiff(repoPath, filePath, isStaged)
    }
  })

  if (!theme) return <></>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.bg }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 32,
          padding: '0 10px',
          gap: 6,
          background: theme.bg,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <svg
          width={11}
          height={11}
          viewBox="0 0 16 16"
          fill="none"
          stroke={theme.fgDim}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M5 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5l-3-3H5z" />
          <path d="M10 11l-2 1.5L6 11" />
          <path d="M8 6v6" />
        </svg>

        <span
          style={{
            fontSize: 11,
            color: theme.fgMuted,
            overflow: 'hidden',
            textOverflow: 'middle',
            whiteSpace: 'nowrap',
            userSelect: 'text',
            flex: 1,
            minWidth: 0,
          }}
          title={filePath}
        >
          {filePath}
        </span>

        {isStaged && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: theme.fgMuted,
              padding: '1px 5px',
              background: theme.surface,
              borderRadius: 999,
            }}
          >
            Staged
          </span>
        )}

        {diff && (
          <>
            {diff.additions > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: theme.diffAddFg }}>
                +{diff.additions}
              </span>
            )}
            {diff.deletions > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: theme.diffRemoveFg }}>
                -{diff.deletions}
              </span>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />

        <ModeToggle mode={mode} onToggle={(m) => setMode(m)} />

        <button
          onClick={() => { void loadDiff(repoPath, filePath, isStaged) }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: theme.fgMuted,
            fontSize: 13,
            padding: 0,
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* Diff body */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <DiffBodyView
          isLoading={loading}
          error={error}
          rows={diff?.rows ?? null}
          filePath={filePath}
          mode={mode}
          theme={theme}
          suppressLeadingTopBorder
        />
      </div>
    </div>
  )
}
