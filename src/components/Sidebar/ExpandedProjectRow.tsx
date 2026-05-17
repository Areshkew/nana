// Original: Muxy/Views/Sidebar/ExpandedProjectRow.swift
// Description: Expanded sidebar project row with name, worktree chevron, and inline worktree list.
// Status: 🚧 In progress

import { useState, useCallback, useRef } from 'react'
import { type Project } from '../../models/project'
import { useAppStore } from '../../stores/appStore'
import { useWorktreeStore } from '../../stores/worktreeStore'
import { useProjectStore } from '../../stores/projectStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { isGitRepository } from '../../services/git/worktree'
import { useMountEffect } from '../../hooks/useMountEffect'
import { WorktreeRow } from './WorktreeRow'
import { ChevronRight, Plus, RefreshCw } from 'lucide-react'
import { confirm } from '../../stores/confirmDialogStore'
import { ProjectIconColorPicker } from './ProjectIconColorPicker'
import { swatchForId, prefersDarkForeground } from '../../models/projectIconColor'
import { loadLogoDataUrl, getLogoDataUrl, invalidateLogoCache } from '../../services/projectLogoService'

interface ExpandedProjectRowProps {
  project: Project
  isActive: boolean
  onSelect: () => void
  onRemove: () => void
  onRename: (name: string) => void
  onNewWorktree: (project: Project) => void
}

export function ExpandedProjectRow({
  project,
  isActive,
  onSelect,
  onRemove,
  onRename,
  onNewWorktree,
}: ExpandedProjectRowProps): JSX.Element {
  const [hovered, setHovered] = useState(false)
  const [worktreesExpanded, setWorktreesExpanded] = useState(false)
  const [isGitRepo, setIsGitRepo] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameText, setRenameText] = useState(project.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [colorPickerPos, setColorPickerPos] = useState({ x: 0, y: 0 })
  const [logoSrc, setLogoSrc] = useState<string | null>(() => getLogoDataUrl(project.logo))

  const selectWorktree = useAppStore((s) => s.selectWorktree)
  const worktreeList = useWorktreeStore((s) => s.list(project.id))
  const activeWorktreeID = useAppStore((s) => s.activeWorktreeID[project.id])
  const refreshFromGit = useWorktreeStore((s) => s.refreshFromGit)
  const setIconColor = useProjectStore((s) => s.setIconColor)
  const setLogo = useProjectStore((s) => s.setLogo)
  const autoExpandWorktrees = useSettingsStore((s) => s.autoExpandWorktreesOnProjectSwitch)

  const wasActiveRef = useRef(isActive)
  if (isActive && !wasActiveRef.current && autoExpandWorktrees && isGitRepo) {
    setWorktreesExpanded(true)
  }
  wasActiveRef.current = isActive

  useMountEffect(() => {
    void isGitRepository(project.path).then(setIsGitRepo)
    if (project.logo && !logoSrc) {
      void loadLogoDataUrl(project.logo).then((url) => {
        if (url) setLogoSrc(url)
      })
    }
  })

  const handleRefreshWorktrees = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await refreshFromGit(project)
    } catch {
      // Error handled silently — could add toast later
    } finally {
      setIsRefreshing(false)
    }
  }, [project, refreshFromGit, isRefreshing])

  const handleHeaderClick = useCallback(() => {
    if (isActive && isGitRepo) {
      setWorktreesExpanded((prev) => !prev)
    } else {
      onSelect()
    }
  }, [isActive, isGitRepo, onSelect])

  const displayLetter = project.name.charAt(0).toUpperCase()
  const activeWorktree = worktreeList.find((w) => w.id === activeWorktreeID)
  const subtitle = isGitRepo && activeWorktree
    ? activeWorktree.isPrimary ? 'primary' : activeWorktree.name
    : null
  const iconSwatch = swatchForId(project.iconColor)

  const headerBg = isActive
    ? 'bg-blue-500/10'
    : hovered
      ? 'bg-[var(--nana-hover)]'
      : ''

  const openContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setMenuOpen(true)
  }, [])

  const closeContextMenu = useCallback(() => setMenuOpen(false), [])

  const handleRename = useCallback(() => {
    setRenameText(project.name)
    setIsRenaming(true)
    closeContextMenu()
  }, [project.name, closeContextMenu])

  const handleRemove = useCallback(async () => {
    closeContextMenu()
    const confirmed = await confirm({
      title: 'Remove Project?',
      message: `Remove "${project.name}" from Nana?`,
      confirmLabel: 'Remove',
      destructive: true,
    })
    if (confirmed) {
      onRemove()
    }
  }, [project.name, onRemove, closeContextMenu])

  const handleColorPick = useCallback((e: React.MouseEvent) => {
    closeContextMenu()
    setColorPickerPos({ x: e.clientX, y: e.clientY })
    setColorPickerOpen(true)
  }, [closeContextMenu])

  const handleColorSelect = useCallback((colorId: string | null) => {
    if (colorId === project.iconColor) {
      setColorPickerOpen(false)
      return
    }
    void setIconColor(project.id, colorId)
    setColorPickerOpen(false)
  }, [project.id, project.iconColor, setIconColor])

  const handleSetLogo = useCallback(async () => {
    closeContextMenu()
    const imagePath = await window.electronAPI.openImageFile()
    if (!imagePath) return
    try {
      const filename = await window.electronAPI.saveLogo(imagePath, project.id)
      const dataUrl = await loadLogoDataUrl(filename)
      if (dataUrl) setLogoSrc(dataUrl)
      await setLogo(project.id, filename)
    } catch {
      // Image load failed — ignore silently
    }
  }, [project.id, setLogo, closeContextMenu])

  const handleRemoveLogo = useCallback(async () => {
    closeContextMenu()
    invalidateLogoCache(project.logo)
    setLogoSrc(null)
    await setLogo(project.id, null)
    void window.electronAPI.removeLogo(project.id)
  }, [project.logo, project.id, setLogo, closeContextMenu])

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer ${headerBg}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleHeaderClick}
        onContextMenu={openContextMenu}
        role="button"
        aria-selected={isActive}
        aria-label={project.name}
      >
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold overflow-hidden ${
            logoSrc
              ? ''
              : isActive
                ? 'text-blue-300'
                : iconSwatch
                  ? ''
                  : 'bg-[var(--nana-surface)] text-[var(--nana-fg-dim)]'
          }`}
          style={
            logoSrc
              ? undefined
              : iconSwatch
                ? { backgroundColor: iconSwatch.hex, color: prefersDarkForeground(iconSwatch.hex) ? '#000' : '#fff' }
                : isActive
                  ? { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                  : undefined
          }
        >
          {logoSrc ? (
            <img src={logoSrc} alt="" className="h-6 w-6 rounded-md object-cover" draggable={false} />
          ) : (
            displayLetter
          )}
        </div>

        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <input
              type="text"
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const trimmed = renameText.trim()
                  if (trimmed.length > 0) onRename(trimmed)
                  setIsRenaming(false)
                }
                if (e.key === 'Escape') setIsRenaming(false)
              }}
              onBlur={() => setIsRenaming(false)}
              className="w-full border-b border-[var(--nana-border)] bg-transparent text-xs font-medium text-[var(--nana-fg)] outline-none"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <>
              <div
            className={`truncate text-xs leading-tight ${
              isActive ? 'font-semibold text-[var(--nana-fg)]' : 'font-medium text-[var(--nana-fg-muted)]'
            }`}
              >
                {project.name}
              </div>
              {subtitle && (
                <div className="truncate font-mono text-[10px] leading-tight text-[var(--nana-fg-dim)]">
                  {subtitle}
                </div>
              )}
            </>
          )}
        </div>

        {isGitRepo && (
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg-muted)]"
            onClick={(e) => {
              e.stopPropagation()
              setWorktreesExpanded((prev) => !prev)
            }}
            aria-label={worktreesExpanded ? 'Collapse Worktrees' : 'Expand Worktrees'}
          >
            <ChevronRight
              size={12}
              className={`transition-transform duration-150 ${worktreesExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        )}
      </div>

      {worktreesExpanded && isGitRepo && (
        <div className="mt-0.5 mb-1 space-y-px pl-2">
          {worktreeList.map((wt) => (
            <WorktreeRow
              key={wt.id}
              projectID={project.id}
              projectPath={project.path}
              worktree={wt}
              selected={wt.id === activeWorktreeID}
              onSelect={() => selectWorktree(project.id, wt)}
            />
          ))}

          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-md px-3 py-1 text-[10px] font-medium text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-blue-400"
            onClick={() => onNewWorktree(project)}
          >
            <Plus size={10} />
            New Worktree
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-md px-3 py-1 text-[10px] font-medium text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-blue-400 disabled:opacity-50"
            onClick={() => void handleRefreshWorktrees()}
            disabled={isRefreshing}
          >
            <RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Worktrees'}
          </button>
        </div>
      )}

      {/* Context menu — matches original ProjectRow / ExpandedProjectRow contextMenu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} onPointerDown={(e) => e.stopPropagation()} />
          <div
            className="fixed z-50 min-w-[160px] rounded-lg border border-[var(--nana-border)] bg-[var(--nana-bg)] py-1 shadow-xl"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              type="button"
              onClick={() => void handleSetLogo()}
              className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--nana-fg)] hover:bg-[var(--nana-hover)]"
            >
              Set Logo…
            </button>
            {logoSrc && (
              <button
                type="button"
                onClick={() => void handleRemoveLogo()}
                className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--nana-fg)] hover:bg-[var(--nana-hover)]"
              >
                Remove Logo
              </button>
            )}
            <button
              type="button"
              onClick={handleRename}
              className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--nana-fg)] hover:bg-[var(--nana-hover)]"
            >
              Rename Project
            </button>
            <button
              type="button"
              onClick={handleColorPick}
              className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--nana-fg)] hover:bg-[var(--nana-hover)]"
            >
              Change Icon Color
            </button>
            {isGitRepo && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    closeContextMenu()
                    void handleRefreshWorktrees()
                  }}
                  className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--nana-fg)] hover:bg-[var(--nana-hover)]"
                >
                  Refresh Worktrees
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeContextMenu()
                    onNewWorktree(project)
                  }}
                  className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--nana-fg)] hover:bg-[var(--nana-hover)]"
                >
                  New Worktree…
                </button>
              </>
            )}
            <div className="my-1 border-t border-[var(--nana-border)]" />
            <button
              type="button"
              onClick={() => void handleRemove()}
              className="flex w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-[var(--nana-hover)]"
            >
              Remove Project
            </button>
          </div>
        </>
      )}

      {colorPickerOpen && (
        <ProjectIconColorPicker
          selectedID={project.iconColor ?? null}
          onSelect={handleColorSelect}
          anchorX={colorPickerPos.x}
          anchorY={colorPickerPos.y}
        />
      )}
    </div>
  )
}
