// Original: Muxy/Views/Sidebar/ProjectRow.swift
// Description: Icon-only project row for the collapsed sidebar.
// Status: 🚧 In progress

import { useState } from 'react'
import { type Project } from '../../models/project'
import { useProjectStore } from '../../stores/projectStore'
import { confirm } from '../../stores/confirmDialogStore'
import { ProjectIconColorPicker } from './ProjectIconColorPicker'
import { swatchForId, prefersDarkForeground } from '../../models/projectIconColor'
import { loadLogoDataUrl, getLogoDataUrl, invalidateLogoCache } from '../../services/projectLogoService'
import { useMountEffect } from '../../hooks/useMountEffect'

interface ProjectRowProps {
  project: Project
  shortcutIndex: number | null
  isActive: boolean
  onSelect: () => void
  onRemove: () => void
  onRename: (name: string) => void
}

export function ProjectRow({
  project,
  shortcutIndex,
  isActive,
  onSelect,
  onRemove,
  onRename,
}: ProjectRowProps): JSX.Element {
  const [hovered, setHovered] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameText, setRenameText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [colorPickerPos, setColorPickerPos] = useState({ x: 0, y: 0 })
  const [logoSrc, setLogoSrc] = useState<string | null>(() => getLogoDataUrl(project.logo))

  const displayLetter = project.name.charAt(0).toUpperCase()
  const iconSwatch = swatchForId(project.iconColor)
  const setIconColor = useProjectStore((s) => s.setIconColor)
  const setLogo = useProjectStore((s) => s.setLogo)

  useMountEffect(() => {
    if (project.logo && !logoSrc) {
      void loadLogoDataUrl(project.logo).then((url) => {
        if (url) setLogoSrc(url)
      })
    }
  })

  const openContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setMenuOpen(true)
  }

  const closeContextMenu = () => setMenuOpen(false)

  const startRename = () => {
    setRenameText(project.name)
    setIsRenaming(true)
    closeContextMenu()
  }

  const commitRename = () => {
    const trimmed = renameText.trim()
    if (trimmed) {
      onRename(trimmed)
    }
    setIsRenaming(false)
  }

  const handleRemove = async () => {
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
  }

  const handleColorPick = (e: React.MouseEvent) => {
    closeContextMenu()
    setColorPickerPos({ x: e.clientX, y: e.clientY })
    setColorPickerOpen(true)
  }

  const handleColorSelect = (colorId: string | null) => {
    if (colorId === project.iconColor) {
      setColorPickerOpen(false)
      return
    }
    void setIconColor(project.id, colorId)
    setColorPickerOpen(false)
  }

  const handleSetLogo = async () => {
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
  }

  const handleRemoveLogo = async () => {
    closeContextMenu()
    invalidateLogoCache(project.logo)
    setLogoSrc(null)
    await setLogo(project.id, null)
    void window.electronAPI.removeLogo(project.id)
  }

  if (isRenaming) {
    return (
      <div className="flex items-center justify-center py-1">
        <input
          type="text"
          value={renameText}
          onChange={(e) => setRenameText(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') setIsRenaming(false)
          }}
          autoFocus
          className="h-8 w-8 rounded-lg bg-[var(--nana-surface)] px-1 text-center text-xs text-[var(--nana-fg)] outline-none"
        />
      </div>
    )
  }

  const hasLogo = !!logoSrc
  const iconBg = hasLogo
    ? 'transparent'
    : iconSwatch
      ? iconSwatch.hex
      : isActive
        ? 'var(--nana-surface)'
        : hovered
          ? 'var(--nana-hover)'
          : 'transparent'

  const iconColor = iconSwatch
    ? prefersDarkForeground(iconSwatch.hex) ? '#000' : '#fff'
    : isActive
      ? 'var(--nana-fg)'
      : hovered
        ? 'var(--nana-fg-muted)'
        : 'var(--nana-fg-dim)'

  return (
    <div
      className="flex items-center justify-center py-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onSelect}
        onContextMenu={openContextMenu}
        onDoubleClick={startRename}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors overflow-hidden"
        style={{ backgroundColor: iconBg, color: iconColor }}
        title={project.name}
        aria-label={project.name}
      >
        {logoSrc ? (
          <img src={logoSrc} alt="" className="h-8 w-8 rounded-lg object-cover" draggable={false} />
        ) : (
          displayLetter
        )}
        {isActive && (
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-sky-400" />
        )}
        {shortcutIndex !== null && (
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/60 text-[8px] text-[var(--nana-fg-muted)]">
            {shortcutIndex}
          </span>
        )}
      </button>

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
            {hasLogo && (
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
              onClick={startRename}
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
