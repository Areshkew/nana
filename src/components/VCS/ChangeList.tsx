// Original: Muxy/Views/VCS/VCSTabView.swift — FileRow + expanded diff inline as one unit
// Description: Virtualized list of changed files with inline diff expansion.
//              Each file renders as a unit: chevron + status + path + stats → optional
//              expanded diff, with a single 1px border separator between sections.
// Status: ✅ Completed

import { useCallback, useState, memo } from 'react'
import { VirtualList } from '../common/VirtualList/VirtualList'
import { InlineDiffView } from './InlineDiffView'
import { useVCSStore } from '../../stores/vcsStore'
import { useThemeStore } from '../../stores/themeStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { confirm } from '../../stores/confirmDialogStore'
import type { GitStatusFile } from '../../services/git/diffTypes'
import type { NanaThemeSnapshot } from '../../theme/nanaTheme'

const ROW_HEIGHT = 34
const EXPANDED_DIFF_HEIGHT = 300

interface ChangeListProps {
  files: GitStatusFile[]
  isStaged: boolean
  repoPath: string
  collapsed: boolean
}

// Original: Muxy/Views/VCS/VCSTabView.swift FileRow.statusColor (lines 1598-1613)
function statusColor(label: string, theme: NanaThemeSnapshot): string {
  switch (label) {
    case 'A': return theme.diffAddFg
    case 'D': return theme.diffRemoveFg
    case 'M':
    case 'R':
    case 'C': return theme.accent
    case 'U': return theme.diffAddFg
    default: return theme.fgMuted
  }
}

// Original: Muxy/Models/GitModels.swift stagedStatusText + unstagedStatusText (lines 55-64)
function statusLabel(file: GitStatusFile, isStaged: boolean): string {
  if (isStaged) {
    return file.xStatus
  }
  if (file.xStatus === '?' && file.yStatus === '?') return 'U'
  return file.yStatus
}

export const ChangeList = memo(function ChangeList({
  files,
  isStaged,
  repoPath,
  collapsed,
}: ChangeListProps): JSX.Element {
  const theme = useThemeStore((s) => s.snapshot)
  const expandedVersion = useVCSStore((s) => s.expandedFilePaths.size)
  const loadDiff = useVCSStore((s) => s.loadDiff)
  const mode = useVCSStore((s) => s.mode)
  const setMode = useVCSStore((s) => s.setMode)
  const toggleExpanded = useVCSStore((s) => s.toggleFileExpanded)
  const stageFileAction = useVCSStore((s) => s.stageFile)
  const unstageFileAction = useVCSStore((s) => s.unstageFile)
  const discardFileAction = useVCSStore((s) => s.discardFile)
  const createDiffViewerTab = useWorkspaceStore((s) => s.createDiffViewerTab)
  const createDiffViewerTabPinned = useWorkspaceStore((s) => s.createDiffViewerTabPinned)
  const activeProjectID = useWorkspaceStore((s) => s.activeProjectID)

  const snapshot = theme!

  const [hoveredPath, setHoveredPath] = useState<string | null>(null)

  const handleToggle = useCallback(
    (filePath: string) => {
      const expanded = useVCSStore.getState().expandedFilePaths.has(filePath)
      toggleExpanded(filePath)
      if (!expanded) {
        void loadDiff(repoPath, filePath, isStaged)
      }
    },
    [loadDiff, repoPath, isStaged, toggleExpanded],
  )

  const handleDiscard = useCallback(
    async (filePath: string, isUntracked: boolean) => {
      const fileName = filePath.split(/[/\\]/).pop() ?? filePath
      const confirmed = await confirm({
        title: 'Discard Changes?',
        message: `Discard changes to ${fileName}? This cannot be undone.`,
        confirmLabel: 'Discard',
        destructive: true,
      })
      if (confirmed) {
        void discardFileAction(repoPath, filePath, isUntracked)
      }
    },
    [discardFileAction, repoPath],
  )

  const estimateSize = useCallback(
    (i: number) => {
      const expanded = useVCSStore.getState().expandedFilePaths.has(files[i].path)
      return expanded ? ROW_HEIGHT + EXPANDED_DIFF_HEIGHT + 1 : ROW_HEIGHT + 1
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, expandedVersion],
  )

  if (collapsed) return <></>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <VirtualList
        items={files}
        overscan={5}
        estimateSize={estimateSize}
        getItemKey={(i) => files[i].path}
        renderItem={(file, _index) => {
          const expanded = useVCSStore.getState().expandedFilePaths.has(file.path)
          const label = statusLabel(file, isStaged)
          const color = statusColor(label, snapshot)

          return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                onClick={() => handleToggle(file.path)}
                onDoubleClick={() => {
                  if (activeProjectID) {
                    createDiffViewerTabPinned(activeProjectID, file.path, isStaged)
                  }
                }}
                onMouseEnter={() => setHoveredPath(file.path)}
                onMouseLeave={() => setHoveredPath(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: ROW_HEIGHT,
                  padding: '0 10px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: hoveredPath === file.path ? snapshot.hover : snapshot.bg,
                }}
              >
                {/* Chevron */}
                <span
                  style={{
                    width: 12,
                    textAlign: 'center',
                    color: snapshot.fgDim,
                    fontSize: 10,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {expanded ? '▾' : '▸'}
                </span>

                {/* Status label */}
                <span
                  style={{
                    color,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    width: 14,
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {label}
                </span>

                {/* File icon (SVG) */}
                <svg
                  width={11}
                  height={11}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, marginLeft: 0 }}
                >
                  <path d="M5 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5l-3-3H5z" />
                  <path d="M10 11l-2 1.5L6 11" />
                  <path d="M8 6v6" />
                </svg>

                {/* File path */}
                <span
                  style={{
                    color: snapshot.fg,
                    fontSize: 12,
                    fontWeight: 500,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginLeft: 8,
                  }}
                >
                  {file.path}
                </span>

                {/* Mode toggle (on hover via CSS visibility? No — just show always for expanded, hide for collapsed) */}
                {expanded && (
                  <div
                    style={{
                      display: 'flex',
                      background: snapshot.surface,
                      borderRadius: 5,
                      border: `1px solid ${snapshot.border}`,
                      overflow: 'hidden',
                      marginLeft: 8,
                      flexShrink: 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(['split', 'unified'] as const).map((m) => {
                      const selected = mode === m
                      return (
                        <button
                          key={m}
                          onClick={() => setMode(m)}
                          style={{
                            width: 22,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: selected ? snapshot.bg : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: selected ? snapshot.fg : snapshot.fgMuted,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: 0,
                          }}
                          title={m === 'unified' ? 'Unified' : 'Split'}
                        >
                          {m === 'unified' ? '☰' : '⊞'}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Stats (additions/deletions/binary) */}
                <span style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                  {file.additions !== null && file.additions > 0 && (
                    <span style={{ color: snapshot.diffAddFg, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 600 }}>
                      +{file.additions}
                    </span>
                  )}
                  {file.deletions !== null && file.deletions > 0 && (
                    <span style={{ color: snapshot.diffRemoveFg, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 600 }}>
                      -{file.deletions}
                    </span>
                  )}
                  {file.isBinary && (
                    <span style={{ color: snapshot.fgMuted, fontSize: 12, fontWeight: 500 }}>Binary</span>
                  )}
                </span>

                {hoveredPath === file.path && (
                <span
                  style={{ display: 'flex', gap: 2, flexShrink: 0, marginLeft: 8 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isStaged ? (
                    <button
                      onClick={() => void unstageFileAction(repoPath, file.path)}
                      title="Unstage"
                      style={actionBtnStyle(snapshot)}
                    >
                      −
                    </button>
                  ) : (
                    <button
                      onClick={() => void stageFileAction(repoPath, file.path)}
                      title="Stage"
                      style={actionBtnStyle(snapshot)}
                    >
                      +
                    </button>
                  )}
                  <button
                    onClick={() => void handleDiscard(file.path, file.xStatus === '?' && file.yStatus === '?')}
                    title="Discard"
                    style={{ ...actionBtnStyle(snapshot), color: snapshot.diffRemoveFg }}
                  >
                    ⊗
                  </button>
                  <button
                    onClick={() => {
                      if (activeProjectID) {
                        createDiffViewerTab(activeProjectID, file.path, isStaged)
                      }
                    }}
                    title="Open in diff viewer"
                    style={actionBtnStyle(snapshot)}
                  >
                    ⊞
                  </button>
                </span>
                )}
              </div>

              {/* Expanded diff — seamlessly below file row, no border between */}
              {expanded && (
                <div style={{ height: EXPANDED_DIFF_HEIGHT, overflow: 'hidden' }}>
                  <InlineDiffView
                    repoPath={repoPath}
                    filePath={file.path}
                    isStaged={isStaged}
                  />
                </div>
              )}

              {/* Separator — 1px border between file sections */}
              <div style={{ height: 1, background: snapshot.border, flexShrink: 0 }} />
            </div>
          )
        }}
      />
    </div>
  )
})

function actionBtnStyle(snapshot: NanaThemeSnapshot): React.CSSProperties {
  return {
    width: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${snapshot.border}`,
    borderRadius: 3,
    background: 'transparent',
    color: snapshot.fgDim,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  }
}
