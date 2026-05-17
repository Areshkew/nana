// Original: Muxy/Views/VCS/PullRequestsListView.swift
// Description: PR list with search, state filter, PR rows, auto-sync menu.
// Status: Completed

import { useState, useRef } from 'react'
import { useVCSStore, type PRListItem } from '../../stores/vcsStore'
import { useThemeStore } from '../../stores/themeStore'
import type { NanaThemeSnapshot } from '../../theme/nanaTheme'
import { useMountEffect } from '../../hooks/useMountEffect'

function stateBadgeAppearance(pr: PRListItem, theme: NanaThemeSnapshot): { symbol: string; color: string } {
  if (pr.isDraft) return { symbol: '\u25CC', color: theme.fgMuted || '#8b949e' }
  if (pr.state === 'OPEN') return { symbol: '\u2B06', color: theme.diffAddFg || '#3fb950' }
  if (pr.state === 'MERGED') return { symbol: '\u2713', color: theme.accent || '#58a6ff' }
  return { symbol: '\u2716', color: theme.diffRemoveFg || '#f85149' }
}

function checksBadge(pr: PRListItem): string | null {
  const rollup = pr.statusCheckRollup
  if (!rollup || rollup.length === 0) return null
  if (rollup.some((c) => c.status === 'COMPLETED' && c.conclusion === 'FAILURE')) return '\u2718'
  if (rollup.some((c) => c.status === 'IN_PROGRESS' || c.status === 'PENDING')) return '\u23F3'
  if (rollup.every((c) => c.status === 'COMPLETED')) return '\u2713'
  return null
}

function checksColor(pr: PRListItem, theme: NanaThemeSnapshot): string {
  const rollup = pr.statusCheckRollup
  if (!rollup || rollup.length === 0) return theme.fgDim
  if (rollup.some((c) => c.status === 'COMPLETED' && c.conclusion === 'FAILURE')) return theme.diffRemoveFg || '#f85149'
  if (rollup.some((c) => c.status === 'IN_PROGRESS' || c.status === 'PENDING')) return theme.fgMuted || '#8b949e'
  return theme.diffAddFg || '#3fb950'
}

const SYNC_OPTIONS = [
  { minutes: 0, label: 'Off' },
  { minutes: 5, label: 'Every 5 minutes' },
  { minutes: 15, label: 'Every 15 minutes' },
  { minutes: 30, label: 'Every 30 minutes' },
  { minutes: 60, label: 'Every hour' },
]

export function PullRequestsListView({ repoPath }: { repoPath: string }): JSX.Element {
  const theme = useThemeStore((s) => s.snapshot)
  const isGhInstalled = useVCSStore((s) => s.isGhInstalled)
  const isLoadingPullRequests = useVCSStore((s) => s.isLoadingPullRequests)
  const pullRequestsLastError = useVCSStore((s) => s.pullRequestsLastError)
  const pullRequestsLastFetched = useVCSStore((s) => s.pullRequestsLastFetched)
  const pullRequests = useVCSStore((s) => s.pullRequests)
  const prSearchQuery = useVCSStore((s) => s.prSearchQuery)
  const prStateFilter = useVCSStore((s) => s.prStateFilter)
  const checkingOutPRNumber = useVCSStore((s) => s.checkingOutPRNumber)
  const prAutoSyncMinutes = useVCSStore((s) => s.prAutoSyncMinutes)
  const getFilteredPRs = useVCSStore((s) => s.getFilteredPRs)
  const setPRSearchQuery = useVCSStore((s) => s.setPRSearchQuery)
  const setPRStateFilter = useVCSStore((s) => s.setPRStateFilter)
  const loadPRList = useVCSStore((s) => s.loadPRList)
  const doCheckoutPR = useVCSStore((s) => s.doCheckoutPR)
  const setPRAutoSyncMinutes = useVCSStore((s) => s.setPRAutoSyncMinutes)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useMountEffect(() => {
    const unsub = useVCSStore.subscribe((state, prev) => {
      if (state.prAutoSyncMinutes !== prev.prAutoSyncMinutes) {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        if (state.prAutoSyncMinutes > 0 && state.currentRepoPath) {
          timerRef.current = setInterval(() => {
            void state.loadPRList(state.currentRepoPath!)
          }, state.prAutoSyncMinutes * 60 * 1000)
        }
      }
    })
    if (prAutoSyncMinutes > 0 && repoPath) {
      timerRef.current = setInterval(() => {
        void loadPRList(repoPath)
      }, prAutoSyncMinutes * 60 * 1000)
    }
    return () => {
      unsub()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  })

  if (!theme) return <></>

  const filteredPRs = getFilteredPRs()

  const controlsBar = (
    <div style={{ display: 'flex', gap: 6, padding: '6px 8px', borderBottom: `1px solid ${theme.border}` }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 6px',
        height: 22,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 4,
        flex: 1,
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: theme.fgDim }}>{'\u2315'}</span>
        <input
          type="text"
          value={prSearchQuery}
          onChange={(e) => setPRSearchQuery(e.target.value)}
          placeholder="Search"
          style={{
            fontSize: 11,
            background: 'transparent',
            color: theme.fg,
            border: 'none',
            outline: 'none',
            flex: 1,
            padding: 0,
          }}
        />
        {prSearchQuery && (
          <button
            onClick={() => setPRSearchQuery('')}
            style={{ background: 'none', border: 'none', color: theme.fgDim, fontSize: 10, cursor: 'pointer', padding: 0 }}
          >
            {'\u2715'}
          </button>
        )}
      </div>

      <select
        value={prStateFilter}
        onChange={(e) => setPRStateFilter(e.target.value)}
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: theme.fgMuted,
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 4,
          padding: '0 6px',
          height: 22,
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="open">Open</option>
        <option value="closed">Closed</option>
        <option value="merged">Merged</option>
        <option value="all">All</option>
      </select>

      <select
        value={prAutoSyncMinutes}
        onChange={(e) => setPRAutoSyncMinutes(Number(e.target.value))}
        title={prAutoSyncMinutes > 0 ? `Auto-sync: every ${prAutoSyncMinutes} min` : 'Auto-sync: off'}
        style={{
          fontSize: 11,
          color: prAutoSyncMinutes > 0 ? theme.accent : theme.fgMuted,
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 4,
          padding: '0 4px',
          height: 22,
          outline: 'none',
          cursor: 'pointer',
          width: 28,
        }}
      >
        {SYNC_OPTIONS.map((opt) => (
          <option key={opt.minutes} value={opt.minutes}>{opt.label}</option>
        ))}
      </select>
    </div>
  )

  if (!isGhInstalled) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {controlsBar}
        <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: theme.fgMuted }}>
          {'\u26A0'} GitHub CLI (gh) is not installed.{'\n'}Install with: brew install gh
        </div>
      </div>
    )
  }

  if (isLoadingPullRequests && pullRequests.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {controlsBar}
        <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: theme.fgMuted }}>
          Loading\u2026
        </div>
      </div>
    )
  }

  if (pullRequestsLastError && pullRequests.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {controlsBar}
        <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: theme.diffRemoveFg || '#f85149' }}>
          {'\u26A0'} {pullRequestsLastError}
        </div>
      </div>
    )
  }

  if (!pullRequestsLastFetched) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {controlsBar}
        <div style={{ padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: theme.fgMuted }}>Pull requests not synced yet</span>
          <button
            onClick={() => void loadPRList(repoPath)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 10px',
              height: 24,
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              color: theme.fg,
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {'\u21BB'} Sync now
          </button>
        </div>
      </div>
    )
  }

  if (filteredPRs.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {controlsBar}
        <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: theme.fgMuted }}>
          {prSearchQuery ? 'No matches' : 'No pull requests'}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {controlsBar}
      {pullRequestsLastError && pullRequests.length > 0 && (
        <div style={{
          padding: '6px 12px',
          fontSize: 11,
          color: theme.diffRemoveFg || '#f85149',
          background: `rgba(248, 81, 73, 0.08)`,
          borderBottom: `1px solid ${theme.border}`,
        }}>
          {'\u26A0'} {pullRequestsLastError}
        </div>
      )}
      <div style={{ overflowY: 'auto' }}>
        {filteredPRs.map((pr) => (
          <PRRow
            key={pr.number}
            pr={pr}
            isCheckingOut={checkingOutPRNumber === pr.number}
            theme={theme}
            onCheckout={() => void doCheckoutPR(repoPath, pr.number)}
          />
        ))}
      </div>
    </div>
  )
}

function PRRow({
  pr,
  isCheckingOut,
  theme,
  onCheckout,
}: {
  pr: PRListItem
  isCheckingOut: boolean
  theme: NanaThemeSnapshot
  onCheckout: () => void
}): JSX.Element {
  const [hovered, setHovered] = useState(false)
  const badge = stateBadgeAppearance(pr, theme)
  const checks = checksBadge(pr)
  const checksClr = checksColor(pr, theme)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onCheckout}
      title={`Checkout PR #${pr.number}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 10px',
        height: 44,
        background: hovered ? theme.surface : 'transparent',
        cursor: 'pointer',
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: badge.color, width: 14, textAlign: 'center', flexShrink: 0 }}>
        {badge.symbol}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: theme.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pr.title}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: theme.fgDim, flexShrink: 0 }}>
            #{pr.number}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 10, color: theme.fgMuted }}>
          <span>{pr.author?.login}</span>
          <span style={{ color: theme.fgDim }}>{'\u2022'}</span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', color: theme.fgMuted }}>
            {pr.headRefName} {'\u2192'} {pr.baseRefName}
          </span>
        </div>
      </div>
      {checks && (
        <span style={{ fontSize: 10, color: checksClr, flexShrink: 0 }}>{checks}</span>
      )}
      {(hovered || isCheckingOut) && (
        <button
          onClick={(e) => { e.stopPropagation(); onCheckout() }}
          disabled={isCheckingOut}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '0 8px',
            height: 22,
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            borderRadius: 4,
            color: theme.fg,
            fontSize: 10,
            fontWeight: 500,
            cursor: isCheckingOut ? 'default' : 'pointer',
            flexShrink: 0,
          }}
        >
          {isCheckingOut ? '\u2026' : '\u2B07'} Checkout
        </button>
      )}
    </div>
  )
}
