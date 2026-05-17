// Original: Muxy/Views/VCS/CreatePRSheet.swift
// Description: Modal sheet for creating a pull request with target branch picker, title,
//              description, new branch field, include options, and draft checkbox.
// Status: Completed

import { useState, useCallback, useRef } from 'react'
import { useVCSStore, type PRBranchStrategy, type PRIncludeMode, type PRCreateRequest } from '../../stores/vcsStore'
import { useThemeStore } from '../../stores/themeStore'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20)
}

interface CreatePRSheetProps {
  repoPath: string
  onClose: () => void
}

export function CreatePRSheet({ repoPath, onClose }: CreatePRSheetProps): JSX.Element {
  const theme = useThemeStore((s) => s.snapshot)
  const currentBranch = useVCSStore((s) => s.branchName)
  const remoteBranches = useVCSStore((s) => s.remoteBranches)
  const defaultBranch = useVCSStore((s) => s.defaultBranch)
  const isLoadingRemoteBranches = useVCSStore((s) => s.isLoadingRemoteBranches)
  const files = useVCSStore((s) => s.files)
  const isOpeningPullRequest = useVCSStore((s) => s.isOpeningPullRequest)
  const doPerformPRFlow = useVCSStore((s) => s.doPerformPRFlow)
  const loadRemoteBranches = useVCSStore((s) => s.loadRemoteBranches)
  const statusMessage = useVCSStore((s) => s.statusMessage)
  const statusIsError = useVCSStore((s) => s.statusIsError)

  const hasStagedChanges = files.some((f) => f.isStaged)
  const hasUnstagedChanges = files.some((f) => f.isUnstaged)
  const hasAnyChanges = hasStagedChanges || hasUnstagedChanges

  const [baseBranch, setBaseBranch] = useState('')
  const [title, setTitle] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [userEditedBranchName, setUserEditedBranchName] = useState(false)
  const [includeAll, setIncludeAll] = useState(true)
  const [draft, setDraft] = useState(false)
  const [appliedDefaults, setAppliedDefaults] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const needsNewBranch = baseBranch !== '' && baseBranch === currentBranch
  const includeMode: PRIncludeMode = !hasAnyChanges ? 'none' : includeAll ? 'all' : 'stagedOnly'
  const trimmedTitle = title.trim()
  const trimmedBranchName = newBranchName.trim()
  const canSubmit = trimmedTitle !== '' && baseBranch !== '' && (!needsNewBranch || trimmedBranchName !== '')

  const applyDefaults = useCallback(() => {
    if (appliedDefaults) return
    setAppliedDefaults(true)
    if (!baseBranch && remoteBranches.length > 0) {
      const target = defaultBranch ?? remoteBranches.find((b) => b !== currentBranch) ?? remoteBranches[0]
      setBaseBranch(target ?? '')
    }
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [appliedDefaults, remoteBranches, defaultBranch, currentBranch, baseBranch])

  if (!appliedDefaults && remoteBranches.length > 0) {
    applyDefaults()
  }

  if (!theme) return <></>

  if (!appliedDefaults && !isLoadingRemoteBranches) {
    void loadRemoteBranches(repoPath)
  }

  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!userEditedBranchName) {
      setNewBranchName(slugify(val))
    }
  }

  const handleBranchNameChange = (val: string) => {
    setNewBranchName(val)
    setUserEditedBranchName(true)
  }

  const handleSubmit = () => {
    if (!canSubmit || isOpeningPullRequest) return
    const strategy: PRBranchStrategy = needsNewBranch
      ? { kind: 'createNew', name: trimmedBranchName }
      : { kind: 'useCurrent' }
    const request: PRCreateRequest = {
      baseBranch,
      title: trimmedTitle,
      body: bodyText,
      branchStrategy: strategy,
      includeMode,
      draft,
    }
    void doPerformPRFlow(repoPath, request).then(() => {
      onClose()
    }).catch(() => {
      // Error shown in statusMessage
    })
  }

  return (
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: 500,
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: `0 16px 48px rgba(0,0,0,0.4)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.accent }}>{'\u2B06'}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.fg }}>Create Pull Request</span>
          <div style={{ flex: 1 }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: theme.fgMuted }}>Target Branch</label>
          {isLoadingRemoteBranches && remoteBranches.length === 0 ? (
            <span style={{ fontSize: 11, color: theme.fgMuted }}>Loading remote branches\u2026</span>
          ) : remoteBranches.length === 0 ? (
            <span style={{ fontSize: 11, color: theme.diffRemoveFg || '#f85149' }}>
              No remote branches found. Push at least one branch to origin first.
            </span>
          ) : (
            <select
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: 11,
                background: theme.surface,
                color: theme.fg,
                border: `1px solid ${theme.border}`,
                borderRadius: 4,
                outline: 'none',
              }}
            >
              {remoteBranches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: theme.fgMuted }}>Title</label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Short summary of the change"
            onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit && !isOpeningPullRequest) handleSubmit() }}
            style={{
              padding: '6px 8px',
              fontSize: 12,
              background: theme.surface,
              color: theme.fg,
              border: `1px solid ${theme.border}`,
              borderRadius: 4,
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: theme.fgMuted }}>Description</label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            style={{
              padding: 6,
              fontSize: 12,
              background: theme.surface,
              color: theme.fg,
              border: `1px solid ${theme.border}`,
              borderRadius: 4,
              outline: 'none',
              minHeight: 100,
              maxHeight: 160,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {needsNewBranch && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: theme.fgMuted }}>New Branch</label>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => handleBranchNameChange(e.target.value)}
              placeholder="branch-name"
              style={{
                padding: '4px 8px',
                fontSize: 11,
                fontFamily: '"JetBrains Mono", monospace',
                background: theme.surface,
                color: theme.fg,
                border: `1px solid ${theme.border}`,
                borderRadius: 4,
                outline: 'none',
              }}
            />
            <span style={{ fontSize: 11, color: theme.fgDim }}>
              A new branch will be created from {currentBranch} for this pull request.
            </span>
          </div>
        )}

        {hasAnyChanges && hasStagedChanges && hasUnstagedChanges && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: theme.fgMuted }}>Include</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.fg, cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={includeAll}
                  onChange={() => setIncludeAll(true)}
                />
                All changes (staged + unstaged)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.fg, cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={!includeAll}
                  onChange={() => setIncludeAll(false)}
                />
                Only staged changes
              </label>
            </div>
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.fg, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={draft}
            onChange={(e) => setDraft(e.target.checked)}
          />
          Create as draft
        </label>

        {statusIsError && statusMessage && (
          <div style={{ fontSize: 11, color: theme.diffRemoveFg || '#f85149' }}>{statusMessage}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            disabled={isOpeningPullRequest}
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
            onClick={handleSubmit}
            disabled={!canSubmit || isOpeningPullRequest}
            style={{
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 500,
              background: canSubmit && !isOpeningPullRequest ? theme.accent : theme.surface,
              color: canSubmit && !isOpeningPullRequest ? theme.bg : theme.fgDim,
              border: `1px solid ${canSubmit && !isOpeningPullRequest ? theme.accent : theme.border}`,
              borderRadius: 5,
              cursor: canSubmit && !isOpeningPullRequest ? 'pointer' : 'default',
            }}
          >
            {isOpeningPullRequest ? 'Creating\u2026' : 'Create PR'}
          </button>
        </div>
      </div>
    </div>
  )
}
