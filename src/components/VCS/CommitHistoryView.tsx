// Original: Muxy/Views/VCS/CommitHistoryView.swift
// Description: Commit history list with two-line rows, commit dots, ref badges,
//              hover-revealed short hash and actions (cherry-pick, revert).
// Status: Completed

import { useState, useCallback } from 'react'
import type { GitCommit } from '../../services/git/vcsService'
import { useThemeStore } from '../../stores/themeStore'
import type { NanaThemeSnapshot } from '../../theme/nanaTheme'

interface CommitHistoryViewProps {
  commits: GitCommit[]
  isLoading: boolean
  hasMore: boolean
  repoPath: string
  onLoadMore: () => void
  onCheckout: (hash: string) => void
  onCherryPick: (hash: string) => void
  onRevert: (hash: string) => void
  collapsed: boolean
}

function commitDotColor(commit: GitCommit, theme: NanaThemeSnapshot): string {
  for (const ref of commit.refs) {
    if (ref.kind === 'head' || ref.kind === 'local') return theme.accent
  }
  for (const ref of commit.refs) {
    if (ref.kind === 'tag') return theme.diffRemoveFg
  }
  return theme.fgMuted
}

function refBadgeColor(kind: string, theme: NanaThemeSnapshot): { fg: string; bg: string } {
  switch (kind) {
    case 'head':
    case 'local': return { fg: theme.accent, bg: theme.accentSoft }
    case 'remote': return { fg: theme.diffAddFg, bg: theme.diffAddBg }
    case 'tag': return { fg: theme.diffRemoveFg, bg: theme.diffRemoveBg }
    default: return { fg: theme.fgMuted, bg: theme.surface }
  }
}

function CommitRow({
  commit,
  isHovered,
  onHoverChange,
  onCherryPick,
  onRevert,
  theme,
}: {
  commit: GitCommit
  isHovered: boolean
  onHoverChange: (hovered: boolean) => void
  onCherryPick: () => void
  onRevert: () => void
  theme: NanaThemeSnapshot
}): JSX.Element {
  const isMerge = commit.parentHashes.length > 1
  const dotColor = commitDotColor(commit, theme)

  const handleMouseEnter = useCallback(() => onHoverChange(true), [onHoverChange])
  const handleMouseLeave = useCallback(() => onHoverChange(false), [onHoverChange])

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: 40,
        padding: '0 10px',
        cursor: 'default',
        background: isHovered ? theme.hover : 'transparent',
      }}
    >
      {/* Line 1: dot + subject */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width={8} height={8} viewBox="0 0 8 8" style={{ flexShrink: 0 }}>
          {isMerge ? (
            <circle cx={4} cy={4} r={3} fill="none" stroke={dotColor} strokeWidth={1.5} />
          ) : (
            <circle cx={4} cy={4} r={4} fill={dotColor} />
          )}
        </svg>
        <span style={{
          flex: 1,
          fontSize: 12,
          color: theme.fg,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {commit.subject}
        </span>
        {isHovered && (
          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            color: theme.fgDim,
            flexShrink: 0,
          }}>
            {commit.shortHash}
          </span>
        )}
      </div>

      {/* Line 2: refs + author + date + hover actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16, marginTop: 2 }}>
        {commit.refs.map((ref) => {
          const colors = refBadgeColor(ref.kind, theme)
          const label = ref.name.length > 14 ? ref.name.slice(0, 14) + '\u2026' : ref.name
          return (
            <span
              key={ref.name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 9,
                fontWeight: 600,
                padding: '1px 5px',
                borderRadius: 3,
                background: colors.bg,
                color: colors.fg,
                flexShrink: 0,
                lineHeight: '14px',
              }}
            >
              {ref.kind === 'head' || ref.kind === 'local' ? (
                <svg width={8} height={8} viewBox="0 0 16 16" fill="currentColor"><path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" /></svg>
              ) : ref.kind === 'remote' ? (
                <svg width={8} height={8} viewBox="0 0 16 16" fill="currentColor"><path d="M4.406 1.342A5.5 5.5 0 018 0a5.5 5.5 0 014.57 2.438 7.5 7.5 0 013.358 3.844.5.5 0 11-.932.366A6.5 6.5 0 0012.1 3.32 5.5 5.5 0 018 1a4.5 4.5 0 00-3.594 1.79.5.5 0 01-.812-.586zm1.06 2.175A3.5 3.5 0 018 2.5a3.5 3.5 0 013.47 3.032A4.5 4.5 0 0114.5 10a4.5 4.5 0 01-4.5 4.5h-4A4.5 4.5 0 011.5 10a4.5 4.5 0 013.032-4.256.5.5 0 01.934.176zM6 8a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 016 8z" /></svg>
              ) : ref.kind === 'tag' ? (
                <svg width={8} height={8} viewBox="0 0 16 16" fill="currentColor"><path d="M1 7.766V1.5C1 .672 1.672 0 2.5 0h6.266a1.5 1.5 0 011.06.44l5.834 5.834a1.5 1.5 0 010 2.122l-6.208 6.208a1.5 1.5 0 01-2.122 0L1.44 8.826A1.5 1.5 0 011 7.766z" /></svg>
              ) : null}
              {label}
            </span>
          )
        })}
        <span style={{
          fontSize: 10,
          color: theme.fgDim,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {commit.authorName}
        </span>
        <span style={{
          fontSize: 10,
          color: theme.fgDim,
          flexShrink: 0,
        }}>
          {formatTimeAgo(commit.authorDate)}
        </span>
        <div style={{ flex: 1 }} />
        {isHovered && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onCherryPick() }}
              title="Cherry-pick"
              style={hoverActionStyle}
            >
              <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx={8} cy={8} r={6} />
                <line x1={8} y1={5} x2={8} y2={11} />
                <line x1={5} y1={8} x2={11} y2={8} />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRevert() }}
              title="Revert"
              style={hoverActionStyle}
            >
              <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8A4 4 0 1 1 8 12" />
                <polyline points="4 12 4 8 8 8" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function CommitHistoryView({
  commits,
  isLoading,
  hasMore,
  onLoadMore,
  onCherryPick,
  onRevert,
  collapsed,
}: CommitHistoryViewProps): JSX.Element {
  const theme = useThemeStore((s) => s.snapshot)
  const [hoveredHash, setHoveredHash] = useState<string | null>(null)

  if (collapsed || !theme) return <></>

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {commits.map((commit) => (
        <CommitRow
          key={commit.hash}
          commit={commit}
          isHovered={hoveredHash === commit.hash}
          onHoverChange={(h) => setHoveredHash(h ? commit.hash : null)}
          onCherryPick={() => void onCherryPick(commit.hash)}
          onRevert={() => void onRevert(commit.hash)}
          theme={theme}
        />
      ))}

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoading}
          style={{
            padding: '6px 10px',
            border: 'none',
            background: 'transparent',
            color: theme.fgDim,
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'center',
            width: '100%',
            fontFamily: 'inherit',
          }}
        >
          {isLoading ? 'Loading\u2026' : 'Load more'}
        </button>
      )}
    </div>
  )
}

const hoverActionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  border: 'none',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--nana-fg-dim)',
  cursor: 'pointer',
  padding: 0,
}

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = Date.now()
    const diff = now - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
  } catch {
    return ''
  }
}
