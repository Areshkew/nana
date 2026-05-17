// Original: Muxy/Views/VCS/VCSTabView.swift — PRPill + PRPopover
// Description: PR pill button with state-based display and popover for merge/close actions.
// Status: Completed

import { useState, useRef, useCallback } from 'react'
import { useVCSStore, type PRInfo, type PRLaunchState } from '../../stores/vcsStore'
import { useThemeStore } from '../../stores/themeStore'
import type { NanaThemeSnapshot } from '../../theme/nanaTheme'

function prStateIcon(info: PRInfo): string {
  if (info.state === 'OPEN') {
    const checks = getChecksStatus(info)
    if (checks === 'failure') return '\u2718'
    if (checks === 'pending') return '\u23F3'
  }
  if (info.state === 'OPEN') return info.isDraft ? '\u270F' : '\u2B06'
  if (info.state === 'MERGED') return '\u2713'
  return '\u2716'
}

function prStateColor(info: PRInfo, theme: NanaThemeSnapshot): string {
  if (info.state === 'OPEN') {
    const checks = getChecksStatus(info)
    if (checks === 'failure') return theme.diffRemoveFg || '#f85149'
    if (checks === 'pending') return theme.fgMuted || '#8b949e'
  }
  if (info.state === 'OPEN') return info.isDraft ? (theme.fgMuted || '#8b949e') : (theme.diffAddFg || '#3fb950')
  if (info.state === 'MERGED') return theme.accent || '#58a6ff'
  return theme.diffRemoveFg || '#f85149'
}

function getChecksStatus(info: PRInfo): string {
  const rollup = info.statusCheckRollup
  if (!rollup || rollup.length === 0) return 'none'
  if (rollup.some((c) => c.status === 'COMPLETED' && c.conclusion === 'FAILURE')) return 'failure'
  if (rollup.some((c) => c.status === 'IN_PROGRESS' || c.status === 'PENDING' || c.status === 'QUEUED')) return 'pending'
  if (rollup.every((c) => c.status === 'COMPLETED')) return 'success'
  return 'none'
}

function stateLabel(info: PRInfo): string {
  if (info.state === 'MERGED') return 'Merged'
  if (info.state === 'CLOSED') return 'Closed'
  if (info.isDraft) return 'Draft'
  const checks = getChecksStatus(info)
  if (checks === 'failure') return 'Checks failing'
  if (checks === 'pending') return 'Checks pending'
  return 'Open'
}

function mergeDisabled(info: PRInfo): boolean {
  if (info.mergeable === 'CONFLICTING') return true
  const status = info.mergeStateStatus
  if (status === 'DIRTY' || status === 'BLOCKED' || status === 'BEHIND' || status === 'DRAFT') return true
  return false
}

function mergeHelpText(info: PRInfo): string {
  if (info.mergeable === 'CONFLICTING') return 'This PR has conflicts and cannot be merged.'
  const status = info.mergeStateStatus
  if (status === 'DIRTY') return 'This PR has conflicts and cannot be merged.'
  if (status === 'BEHIND') return 'This branch is out of date. Update it before merging.'
  if (status === 'BLOCKED') return 'Merging is blocked by branch protection.'
  if (status === 'DRAFT') return 'This PR is a draft. Mark it ready for review first.'
  return ''
}

export function PRPill({
  repoPath,
  launchState,
  onRequestCreate,
}: {
  repoPath: string
  launchState: PRLaunchState
  onRequestCreate: () => void
}): JSX.Element | null {
  const theme = useThemeStore((s) => s.snapshot)
  const [showPopover, setShowPopover] = useState(false)
  const [mergeMethod, setMergeMethod] = useState<'squash' | 'merge' | 'rebase'>('squash')
  const popoverRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLButtonElement>(null)

  const isMerging = useVCSStore((s) => s.isMergingPullRequest)
  const isClosing = useVCSStore((s) => s.isClosingPullRequest)
  const isRefreshing = useVCSStore((s) => s.isRefreshingPRInfo)
  const doMergePR = useVCSStore((s) => s.doMergePR)
  const doClosePR = useVCSStore((s) => s.doClosePR)
  const loadPullRequestInfo = useVCSStore((s) => s.loadPullRequestInfo)
  const isOpeningPullRequest = useVCSStore((s) => s.isOpeningPullRequest)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (showPopover &&
      popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
      pillRef.current && !pillRef.current.contains(e.target as Node)) {
      setShowPopover(false)
    }
  }, [showPopover])

  useState(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  })

  if (!theme) return null
  if (launchState.kind === 'hidden') return null

  if (launchState.kind === 'ghMissing') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          fontSize: 10,
          fontWeight: 600,
          color: theme.fgMuted,
          background: theme.surface,
          border: `1px solid ${theme.fgMuted}35`,
          borderRadius: 5,
          cursor: 'default',
          opacity: 0.6,
        }}
        title="Install GitHub CLI to create pull requests"
      >
        Install gh
      </span>
    )
  }

  if (launchState.kind === 'canCreate') {
    return (
      <button
        onClick={onRequestCreate}
        disabled={isOpeningPullRequest}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          fontSize: 10,
          fontWeight: 600,
          color: theme.accent,
          background: theme.surface,
          border: `1px solid ${theme.accent}55`,
          borderRadius: 5,
          cursor: 'pointer',
        }}
        title="Create a pull request"
      >
        Create PR
      </button>
    )
  }

  const info = launchState.info
  const color = prStateColor(info, theme)
  const icon = prStateIcon(info)

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={pillRef}
        onClick={() => setShowPopover(!showPopover)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          fontSize: 10,
          fontWeight: 600,
          color: theme.fg + 'd9',
          background: theme.surface,
          border: `1px solid ${color}55`,
          borderRadius: 5,
          cursor: 'pointer',
        }}
        title={`Pull request #${info.number}`}
      >
        <span style={{ color, fontSize: 9, fontWeight: 700 }}>{icon}</span>
        PR #{info.number}
        <span style={{ fontSize: 8, color: theme.fgDim }}>{'\u25BC'}</span>
      </button>

      {showPopover && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            width: 260,
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            padding: 12,
            zIndex: 100,
            boxShadow: `0 8px 24px ${theme.bg}80`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color }}>{icon}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.fg }}>
                Pull Request #{info.number}
              </span>
              <span style={{ fontSize: 10, color: theme.fgMuted }}>{stateLabel(info)}</span>
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => void loadPullRequestInfo(repoPath)}
              disabled={isRefreshing}
              style={{
                background: 'none',
                border: 'none',
                color: theme.fgMuted,
                cursor: isRefreshing ? 'default' : 'pointer',
                fontSize: 11,
                padding: 4,
              }}
              title="Refresh"
            >
              {isRefreshing ? '\u23F3' : '\u21BB'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: theme.fgMuted }}>
            <div><span style={{ color: theme.fgDim }}>Base:</span> {info.baseRefName}</div>
            {info.mergeable === 'CONFLICTING' && (
              <div style={{ color: theme.diffRemoveFg || '#f85149' }}>Has conflicts</div>
            )}
            {info.mergeable === 'MERGEABLE' && (
              <div style={{ color: theme.diffAddFg || '#3fb950' }}>Mergeable</div>
            )}
          </div>

          <div style={{ height: 1, background: theme.border }} />

          <button
            onClick={() => {
              setShowPopover(false)
              window.open(info.url, '_blank')
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 8px',
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: 5,
              color: theme.fg,
              fontSize: 11,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Open on GitHub
          </button>

          {info.state === 'OPEN' && (
            <>
              <div style={{ display: 'flex', gap: 2, background: theme.surface, borderRadius: 5, padding: 2 }}>
                {(['squash', 'merge', 'rebase'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMergeMethod(m)}
                    style={{
                      flex: 1,
                      padding: '4px 0',
                      fontSize: 10,
                      fontWeight: 500,
                      textAlign: 'center',
                      border: 'none',
                      borderRadius: 3,
                      cursor: 'pointer',
                      background: mergeMethod === m ? theme.bg : 'transparent',
                      color: mergeMethod === m ? theme.fg : theme.fgMuted,
                    }}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  void doMergePR(repoPath, info.number, mergeMethod)
                  setShowPopover(false)
                }}
                disabled={mergeDisabled(info) || isMerging}
                title={mergeHelpText(info) || `Merge with ${mergeMethod}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  background: mergeDisabled(info) ? theme.surface : theme.accent,
                  border: `1px solid ${mergeDisabled(info) ? theme.border : theme.accent}`,
                  borderRadius: 5,
                  color: mergeDisabled(info) ? theme.fgDim : theme.bg,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: mergeDisabled(info) ? 'default' : 'pointer',
                  width: '100%',
                }}
              >
                {isMerging ? 'Merging\u2026' : `${mergeMethod.charAt(0).toUpperCase() + mergeMethod.slice(1)} and merge`}
              </button>

              <button
                onClick={() => {
                  void doClosePR(repoPath, info.number)
                  setShowPopover(false)
                }}
                disabled={isClosing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 5,
                  color: theme.diffRemoveFg || '#f85149',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: isClosing ? 'default' : 'pointer',
                  width: '100%',
                }}
              >
                {isClosing ? 'Closing\u2026' : 'Close PR'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
