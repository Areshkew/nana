// Original: Muxy/Views/VCS/VCSTabView.swift
// Description: Full VCS tab view with header (branch picker, PR pill, refresh), commit area,
//              staged/changes lists with inline diff, commit history, pull requests.
// Status: Completed

import { useCallback, useState, useMemo, useRef } from 'react'
import { useMountEffect } from '../../hooks/useMountEffect'
import { ChangeList } from './ChangeList'
import { BranchPicker } from './BranchPicker'
import { CommitHistoryView } from './CommitHistoryView'
import { PRPill } from './PRPill'
import { CreatePRSheet } from './CreatePRSheet'
import { PullRequestsListView } from './PullRequestsListView'
import { useVCSStore } from '../../stores/vcsStore'
import { useThemeStore } from '../../stores/themeStore'
import { useWorktreeStore } from '../../stores/worktreeStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { confirm } from '../../stores/confirmDialogStore'

interface VCSTabViewProps {
  repoPath: string
}

function SectionHeader({
  title,
  count,
  collapsed,
  onToggle,
  theme,
  actions,
}: {
  title: string
  count: number
  collapsed: boolean
  onToggle: () => void
  theme: { fg: string; fgMuted: string; fgDim: string; border: string; bg: string }
  actions?: JSX.Element
}): JSX.Element {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 30,
        padding: '0 10px',
        cursor: 'pointer',
        userSelect: 'none',
        borderBottom: `1px solid ${theme.border}`,
        background: theme.bg,
        gap: 6,
      }}
    >
      <svg width={9} height={9} viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
        <path
          d={collapsed ? 'M3 1L7 5L3 9' : 'M1 3L5 7L9 3'}
          fill="none"
          stroke={theme.fgDim}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span style={{ fontSize: 11, fontWeight: 600, color: theme.fgMuted }}>
        {title}
      </span>
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        fontFamily: '"JetBrains Mono", monospace',
        color: theme.bg,
        background: theme.fgMuted,
        padding: '1px 6px',
        borderRadius: 999,
        lineHeight: '14px',
      }}>
        {count}
      </span>
      <div style={{ flex: 1 }} />
      {actions}
    </div>
  )
}

function StatusPill({
  message,
  isError,
  onDismiss,
}: {
  message: string
  isError: boolean
  onDismiss: () => void
}): JSX.Element {
  const theme = useThemeStore((s) => s.snapshot)!

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: 8,
      padding: '6px 8px',
      borderRadius: 5,
      fontSize: 11,
      lineHeight: 1.4,
      background: isError ? withAlpha(theme.diffRemoveFg, 0.1) : withAlpha(theme.diffAddFg, 0.1),
      border: `1px solid ${isError ? withAlpha(theme.diffRemoveFg, 0.2) : withAlpha(theme.diffAddFg, 0.2)}`,
    }}>
      <span style={{ flexShrink: 0, color: isError ? theme.diffRemoveFg : theme.diffAddFg, fontWeight: 600 }}>
        {isError ? '\u26A0' : '\u2713'}
      </span>
      <span style={{ flex: 1, color: isError ? theme.diffRemoveFg : theme.diffAddFg, wordBreak: 'break-word' }}>
        {message}
      </span>
      <button
        onClick={onDismiss}
        style={{
          flexShrink: 0,
          border: 'none',
          background: 'transparent',
          color: theme.fgDim,
          fontSize: 12,
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
        }}
      >
        {'\u00D7'}
      </button>
    </div>
  )
}

function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return hex
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`
}

function SpinningIcon({ color }: { color: string }): JSX.Element {
  return (
    <span style={{
      display: 'inline-block',
      width: 10,
      height: 10,
      border: `2px solid ${withAlpha(color, 0.3)}`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'nana-spin 0.6s linear infinite',
    }} />
  )
}

function AheadBehindIndicator({ aheadBehind, theme }: {
  aheadBehind: { ahead: number; behind: number; hasUpstream: boolean }
  theme: { fgDim: string; fgMuted: string; accent: string; diffAddFg: string }
}): JSX.Element | null {
  if (!aheadBehind.hasUpstream) {
    return (
      <span title="No upstream branch set" style={{
        fontSize: 10,
        color: theme.fgDim,
        fontFamily: '"JetBrains Mono", monospace',
        flexShrink: 0,
      }}>
        {'\u27F3'}
      </span>
    )
  }
  if (aheadBehind.ahead === 0 && aheadBehind.behind === 0) return null
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 10,
      fontFamily: '"JetBrains Mono", monospace',
      color: theme.fgDim,
      flexShrink: 0,
    }}>
      {aheadBehind.ahead > 0 && (
        <span title={`${aheadBehind.ahead} commit(s) ahead of remote`} style={{ color: theme.accent }}>
          {'\u2191'}{aheadBehind.ahead}
        </span>
      )}
      {aheadBehind.behind > 0 && (
        <span title={`${aheadBehind.behind} commit(s) behind remote`} style={{ color: theme.diffAddFg }}>
          {'\u2193'}{aheadBehind.behind}
        </span>
      )}
    </span>
  )
}

interface DropdownItem {
  label: string
  action: () => void
  separator?: false
}

interface DropdownSeparator {
  separator: true
  label?: undefined
  action?: undefined
}

type MenuItem = DropdownItem | DropdownSeparator

function MoreActionsDropdown({ items, theme }: { items: MenuItem[]; theme: { bg: string; fg: string; fgMuted: string; border: string; hover: string; surface: string } }): JSX.Element {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useMountEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  })

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(!open)}
        title="More actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 28,
          width: 28,
          borderRadius: 6,
          border: `1px solid ${theme.border}`,
          background: theme.surface,
          color: theme.fgMuted,
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        {'\u22EF'}
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 4,
          minWidth: 180,
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {items.map((item, i) => {
            if (item.separator) {
              return <div key={`sep-${i}`} style={{ height: 1, background: theme.border, margin: '4px 0' }} />
            }
            return (
              <button
                key={item.label}
                onClick={() => { setOpen(false); item.action() }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '7px 12px',
                  border: 'none',
                  background: 'transparent',
                  color: theme.fg,
                  fontSize: 11,
                  fontWeight: 400,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = theme.hover }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function VCSTabView({ repoPath }: VCSTabViewProps): JSX.Element {
  const theme = useThemeStore((s) => s.snapshot)
  const files = useVCSStore((s) => s.files)
  const isLoading = useVCSStore((s) => s.isLoadingFiles)
  const error = useVCSStore((s) => s.errorMessage)
  const loadFiles = useVCSStore((s) => s.loadChangedFiles)
  const stagedCollapsed = useVCSStore((s) => s.stagedCollapsed)
  const changesCollapsed = useVCSStore((s) => s.changesCollapsed)
  const historyCollapsed = useVCSStore((s) => s.historyCollapsed)
  const pullRequestsCollapsed = useVCSStore((s) => s.pullRequestsCollapsed)
  const toggleStaged = useVCSStore((s) => s.toggleStagedCollapsed)
  const toggleChanges = useVCSStore((s) => s.toggleChangesCollapsed)
  const toggleHistory = useVCSStore((s) => s.toggleHistoryCollapsed)
  const togglePullRequests = useVCSStore((s) => s.togglePullRequestsCollapsed)
  const changesVisible = useVCSStore((s) => s.changesVisible)
  const historyVisible = useVCSStore((s) => s.historyVisible)
  const pullRequestsVisible = useVCSStore((s) => s.pullRequestsVisible)

  const branchName = useVCSStore((s) => s.branchName)
  const branches = useVCSStore((s) => s.branches)
  const isLoadingBranches = useVCSStore((s) => s.isLoadingBranches)
  const loadBranches = useVCSStore((s) => s.loadBranches)
  const doSwitchBranch = useVCSStore((s) => s.doSwitchBranch)
  const doCreateBranch = useVCSStore((s) => s.doCreateBranch)
  const doDeleteBranch = useVCSStore((s) => s.doDeleteBranch)

  const commitMessage = useVCSStore((s) => s.commitMessage)
  const isCommitting = useVCSStore((s) => s.isCommitting)
  const isPushing = useVCSStore((s) => s.isPushing)
  const isPulling = useVCSStore((s) => s.isPulling)
  const aheadBehind = useVCSStore((s) => s.aheadBehind)
  const showPushUpstreamConfirmation = useVCSStore((s) => s.showPushUpstreamConfirmation)
  const statusMessage = useVCSStore((s) => s.statusMessage)
  const statusIsError = useVCSStore((s) => s.statusIsError)
  const statusMessageSetAt = useVCSStore((s) => s.statusMessageSetAt)
  const setCommitMessage = useVCSStore((s) => s.setCommitMessage)
  const doCommit = useVCSStore((s) => s.doCommit)
  const doPush = useVCSStore((s) => s.doPush)
  const doPushUpstream = useVCSStore((s) => s.doPushUpstream)
  const doPull = useVCSStore((s) => s.doPull)
  const doFetch = useVCSStore((s) => s.doFetch)
  const doPullRebase = useVCSStore((s) => s.doPullRebase)
  const doSync = useVCSStore((s) => s.doSync)
  const clearStatusMessage = useVCSStore((s) => s.clearStatusMessage)
  const discardAll = useVCSStore((s) => s.discardAll)
  const stageAll = useVCSStore((s) => s.stageAll)
  const unstageAll = useVCSStore((s) => s.unstageAll)

  const commits = useVCSStore((s) => s.commits)
  const isLoadingCommits = useVCSStore((s) => s.isLoadingCommits)
  const hasMoreCommits = useVCSStore((s) => s.hasMoreCommits)
  const loadCommits = useVCSStore((s) => s.loadCommits)
  const doCherryPick = useVCSStore((s) => s.doCherryPick)
  const doRevert = useVCSStore((s) => s.doRevert)

  const checkGhInstalled = useVCSStore((s) => s.checkGhInstalled)
  const getPRLaunchState = useVCSStore((s) => s.getPRLaunchState)
  const showDirtyTreeConfirmation = useVCSStore((s) => s.showDirtyTreeConfirmation)
  const confirmDirtyTreeCheckout = useVCSStore((s) => s.confirmDirtyTreeCheckout)
  const cancelDirtyTreeCheckout = useVCSStore((s) => s.cancelDirtyTreeCheckout)
  const [showCreatePRSheet, setShowCreatePRSheet] = useState(false)

  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const worktreeName = useMemo(() => {
    const wtStore = useWorktreeStore.getState()
    const projectID = wtStore.projectIDForPath(repoPath)
    if (!projectID) return 'default'
    const worktrees = wtStore.list(projectID)
    const match = worktrees.find((w) => {
      const wp = w.path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
      const rp = repoPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
      return wp === rp
    })
    if (!match) return 'default'
    return match.isPrimary ? (match.name || 'default') : match.name
  }, [repoPath])

  const stagedFiles = useMemo(() => files.filter((f) => f.isStaged), [files])
  const unstagedFiles = useMemo(() => files.filter((f) => f.isUnstaged), [files])
  const hasStagedFiles = stagedFiles.length > 0

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        void doCommit(repoPath)
      }
    },
    [repoPath, doCommit],
  )

  const handleDiscardAll = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Discard All Changes?',
      message: 'This will discard all unstaged changes. This cannot be undone.',
      confirmLabel: 'Discard All',
      destructive: true,
    })
    if (confirmed) void discardAll(repoPath)
  }, [discardAll, repoPath])

  useMountEffect(() => {
    void loadFiles(repoPath)
    void loadBranches(repoPath)
    void loadCommits(repoPath, true)
    void checkGhInstalled(repoPath)
    void window.electronAPI.gitWatchStart(repoPath)
    const unsub = window.electronAPI.onGitDirectoryChanged((changedPath) => {
      if (changedPath === repoPath && !useVCSStore.getState().isLoadingFiles) {
        void loadFiles(repoPath)
      }
    })
    return () => {
      void window.electronAPI.gitWatchStop(repoPath)
      unsub()
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    }
  })

  const menuItems: MenuItem[] = useMemo(() => [
    { label: 'Fetch', action: () => void doFetch(repoPath) },
    { label: 'Sync (Pull + Push)', action: () => void doSync(repoPath) },
    { separator: true },
    { label: 'Pull (Rebase)', action: () => void doPullRebase(repoPath) },
    { separator: true },
    { label: 'Discard All Changes', action: () => void handleDiscardAll() },
  ], [repoPath, doFetch, doSync, doPullRebase, handleDiscardAll])

  const pullTooltip = aheadBehind.behind > 0
    ? `Pull ${aheadBehind.behind} commit(s) from origin`
    : 'Pull from remote'
  const pushTooltip = aheadBehind.ahead > 0
    ? `Push ${aheadBehind.ahead} commit(s) to origin`
    : 'Push to remote'

  if (!theme) return <></>

  if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
  if (statusMessage && !statusIsError && statusMessageSetAt) {
    const elapsed = Date.now() - statusMessageSetAt
    const remaining = Math.max(0, 4000 - elapsed)
    autoDismissRef.current = setTimeout(() => {
      useVCSStore.getState().clearStatusMessage()
    }, remaining)
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: theme.bg,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          height: 32,
          padding: '0 8px',
          borderBottom: `1px solid ${theme.border}`,
          gap: 9,
          flexShrink: 0,
        }}>
          <div style={{
            width: 14,
            height: 14,
            border: `2px solid ${theme.border}`,
            borderTopColor: theme.fgMuted,
            borderRadius: '50%',
            animation: 'nana-spin 0.7s linear infinite',
          }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: theme.fgDim }}>
            Loading git status...
          </span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: '0 0' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              height: 30,
              borderBottom: `1px solid ${theme.border}`,
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              gap: 6,
              opacity: 0.5,
            }}>
              <div style={{ width: 9, height: 9 }} />
              <div style={{
                width: 70 + i * 15,
                height: 10,
                borderRadius: 3,
                background: theme.border,
              }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes nana-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
      }}>
        <div style={{ fontSize: 13, color: theme.diffRemoveFg, textAlign: 'center', lineHeight: 1.5 }}>
          {error}
        </div>
        <button
          onClick={() => void loadFiles(repoPath)}
          style={{
            padding: '6px 14px',
            fontSize: 11,
            fontWeight: 500,
            background: theme.accent,
            color: theme.bg,
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  const commitDisabled = isCommitting || !commitMessage.trim() || !hasStagedFiles
  const commitTooltip = !hasStagedFiles
    ? 'No staged changes to commit'
    : !commitMessage.trim()
      ? 'Enter a commit message'
      : isCommitting
        ? 'Committing...'
        : `Commit on ${branchName ?? 'branch'}`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: theme.bg,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 32,
          padding: '0 8px',
          borderBottom: `1px solid ${theme.border}`,
          gap: 6,
          flexShrink: 0,
        }}
      >
        <span
          title={worktreeName}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 6px',
            fontSize: 10,
            fontWeight: 500,
            color: theme.fg + 'd9',
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 5,
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {'\u{1F4E6}'} {worktreeName}
        </span>
        <BranchPicker
          currentBranch={branchName}
          branches={branches}
          isLoading={isLoadingBranches}
          onCreateBranch={(name) => doCreateBranch(repoPath, name)}
          onSwitchBranch={(name) => doSwitchBranch(repoPath, name)}
          onDeleteBranch={(name) => doDeleteBranch(repoPath, name)}
        />
        <AheadBehindIndicator aheadBehind={aheadBehind} theme={theme} />
        <PRPill
          repoPath={repoPath}
          launchState={getPRLaunchState()}
          onRequestCreate={() => setShowCreatePRSheet(true)}
        />
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { void loadFiles(repoPath); void loadBranches(repoPath) }}
          title="Refresh"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            border: 'none',
            borderRadius: 4,
            background: 'transparent',
            color: theme.fgDim,
            fontSize: 14,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = theme.hover }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          ↻
        </button>
      </div>

      {/* Commit area */}
      <div style={{ padding: 10, borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Commit message (${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to commit on ${branchName ?? 'branch'})`}
          rows={2}
          style={{
            width: '100%',
            resize: 'none',
            fontSize: 12,
            color: theme.fg,
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 6,
            padding: '9px 5px',
            fontFamily: 'inherit',
            outline: 'none',
            lineHeight: 1.4,
            minHeight: 27,
            maxHeight: 50,
          }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button
            onClick={() => void doCommit(repoPath)}
            disabled={commitDisabled}
            title={commitTooltip}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              flex: 1,
              height: 28,
              borderRadius: 6,
              border: commitMessage.trim() && hasStagedFiles ? 'none' : `1px solid ${theme.border}`,
              background: commitMessage.trim() && hasStagedFiles ? theme.accent : theme.surface,
              color: commitMessage.trim() && hasStagedFiles ? theme.bg : theme.fgDim,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: commitDisabled ? 'default' : 'pointer',
              opacity: commitDisabled ? 0.6 : 1,
            }}
          >
            {isCommitting ? <><SpinningIcon color={theme.bg} /> Committing{'\u2026'}</> : (
              <>
                <svg width={10} height={10} viewBox="0 0 10 10">
                  <path d="M1 5.5L3.5 8L9 2" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Commit
              </>
            )}
          </button>
          <button
            onClick={() => void doPull(repoPath)}
            disabled={isPulling}
            title={pullTooltip}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              height: 28,
              padding: '0 10px',
              borderRadius: 6,
              border: `1px solid ${theme.border}`,
              background: theme.surface,
              color: theme.fg,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {isPulling ? <SpinningIcon color={theme.fg} /> : (
              <svg width={10} height={10} viewBox="0 0 10 10">
                <path d="M5 1V7M2 5L5 8L8 5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isPulling ? 'Pulling\u2026' : 'Pull'}
            {aheadBehind.behind > 0 && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: '"JetBrains Mono", monospace',
                background: theme.diffAddFg,
                color: theme.bg,
                borderRadius: 999,
                padding: '1px 5px',
                lineHeight: '14px',
              }}>
                {aheadBehind.behind}
              </span>
            )}
          </button>
          {showPushUpstreamConfirmation ? (
            <button
              onClick={() => void doPushUpstream(repoPath)}
              disabled={isPushing}
              title={`Push and set upstream to origin/${branchName}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                height: 28,
                padding: '0 10px',
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                background: theme.accent,
                color: theme.bg,
                fontSize: 11,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {isPushing ? <SpinningIcon color={theme.bg} /> : null}
              Push upstream
            </button>
          ) : (
            <button
              onClick={() => void doPush(repoPath)}
              disabled={isPushing}
              title={pushTooltip}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                height: 28,
                padding: '0 10px',
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                background: theme.surface,
                color: theme.fg,
                fontSize: 11,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {isPushing ? <SpinningIcon color={theme.fg} /> : (
                <svg width={10} height={10} viewBox="0 0 10 10">
                  <path d="M5 7V1M2 3L5 0L8 3" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {isPushing ? 'Pushing\u2026' : 'Push'}
              {aheadBehind.ahead > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: '"JetBrains Mono", monospace',
                  background: theme.accent,
                  color: theme.bg,
                  borderRadius: 999,
                  padding: '1px 5px',
                  lineHeight: '14px',
                }}>
                  {aheadBehind.ahead}
                </span>
              )}
            </button>
          )}
          <MoreActionsDropdown items={menuItems} theme={theme} />
        </div>
        {statusMessage && (
          <StatusPill
            message={statusMessage}
            isError={statusIsError}
            onDismiss={clearStatusMessage}
          />
        )}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {stagedFiles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <SectionHeader
              title="Staged"
              count={stagedFiles.length}
              collapsed={stagedCollapsed}
              onToggle={toggleStaged}
              theme={theme}
              actions={
                <button
                  onClick={(e) => { e.stopPropagation(); void unstageAll(repoPath) }}
                  title="Unstage all"
                  style={sectionActionStyle}
                >
                  <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <line x1="4" y1="8" x2="12" y2="8" />
                  </svg>
                </button>
              }
            />
            <div style={{ display: stagedCollapsed ? 'none' : 'block' }}>
              <ChangeList
                files={stagedFiles}
                isStaged={true}
                repoPath={repoPath}
                collapsed={stagedCollapsed}
              />
            </div>
          </div>
        )}

        {changesVisible && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <SectionHeader
              title="Changes"
              count={unstagedFiles.length}
              collapsed={changesCollapsed}
              onToggle={toggleChanges}
              theme={theme}
              actions={
                <button
                  onClick={(e) => { e.stopPropagation(); void stageAll(repoPath) }}
                  title="Stage all"
                  style={sectionActionStyle}
                >
                  <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <line x1="8" y1="4" x2="8" y2="12" />
                    <line x1="4" y1="8" x2="12" y2="8" />
                  </svg>
                </button>
              }
            />
            <div style={{ display: changesCollapsed ? 'none' : 'block' }}>
              {files.length === 0 ? (
                <div style={{ padding: 12, fontSize: 12, color: theme.fgMuted, textAlign: 'center' }}>
                  No changes
                </div>
              ) : (
                <ChangeList
                  files={unstagedFiles}
                  isStaged={false}
                  repoPath={repoPath}
                  collapsed={changesCollapsed}
                />
              )}
            </div>
          </div>
        )}

        {pullRequestsVisible && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: pullRequestsCollapsed ? '0 0 auto' : '1 1 0', minHeight: 0 }}>
            <SectionHeader
              title="Pull Requests"
              count={0}
              collapsed={pullRequestsCollapsed}
              onToggle={togglePullRequests}
              theme={theme}
            />
            {!pullRequestsCollapsed && (
              <PullRequestsListView repoPath={repoPath} />
            )}
          </div>
        )}

        {historyVisible && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <SectionHeader
              title="History"
              count={commits.length}
              collapsed={historyCollapsed}
              onToggle={toggleHistory}
              theme={theme}
              actions={
                <button
                  onClick={(e) => { e.stopPropagation(); void loadCommits(repoPath) }}
                  title="Refresh history"
                  style={sectionActionStyle}
                >
                  <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" />
                    <polyline points="8 2.5 13.5 2.5 13.5 8" />
                  </svg>
                </button>
              }
            />
            {!historyCollapsed && (
              <CommitHistoryView
                commits={commits}
                isLoading={isLoadingCommits}
                hasMore={hasMoreCommits}
                repoPath={repoPath}
                onLoadMore={() => void loadCommits(repoPath)}
                onCheckout={(_hash) => void useWorkspaceStore.getState().createTab(repoPath)}
                onCherryPick={(hash) => void doCherryPick(repoPath, hash)}
                onRevert={(hash) => void doRevert(repoPath, hash)}
                collapsed={false}
              />
            )}
          </div>
        )}
      </div>
      {showCreatePRSheet && (
        <CreatePRSheet
          repoPath={repoPath}
          onClose={() => setShowCreatePRSheet(false)}
        />
      )}
      {showDirtyTreeConfirmation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={cancelDirtyTreeCheckout}
        >
          <div
            style={{
              width: 380,
              background: theme.bg,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.fg }}>
              Uncommitted Changes
            </div>
            <div style={{ fontSize: 12, color: theme.fgMuted, lineHeight: 1.5 }}>
              You have uncommitted changes. Switching branches may fail or move them. Continue?
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={cancelDirtyTreeCheckout}
                style={{
                  padding: '6px 14px',
                  fontSize: 11,
                  background: theme.surface,
                  color: theme.fg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 5,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDirtyTreeCheckout}
                style={{
                  padding: '6px 14px',
                  fontSize: 11,
                  fontWeight: 500,
                  background: theme.accent,
                  color: theme.bg,
                  border: 'none',
                  borderRadius: 5,
                  cursor: 'pointer',
                }}
              >
                Checkout Anyway
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes nana-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const sectionActionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  border: 'none',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--nana-fg-muted)',
  cursor: 'pointer',
  padding: 0,
}
