// Original: Muxy/Views/ThemePicker.swift
// Description: Searchable theme list with color preview swatches.
// Status: ✅ Completed

import { useState, useCallback, useRef } from 'react'
import { useThemeStore } from '../../stores/themeStore'
import { type ThemePreview } from '../../services/themeService'
import { Check } from 'lucide-react'
import { getThemePickerAnchor, setThemePickerAnchor } from './themePickerState'

export function ThemePickerAnchor(): JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        id="nana-theme-picker-trigger"
        type="button"
        className="hidden"
        onClick={() => setOpen(true)}
      >
        Open Theme Picker
      </button>
      {open && getThemePickerAnchor() && (
        <ThemePickerPopover
          anchorX={getThemePickerAnchor()!.x}
          anchorY={getThemePickerAnchor()!.y}
          onClose={() => {
            setOpen(false)
            setThemePickerAnchor(0, 0)
          }}
        />
      )}
    </>
  )
}

function ThemePickerPopover({
  anchorX,
  anchorY,
  onClose,
}: {
  anchorX: number
  anchorY: number
  onClose: () => void
}): JSX.Element {
  const themes = useThemeStore((s) => s.themes)
  const currentThemeName = useThemeStore((s) => s.currentThemeName)
  const applyTheme = useThemeStore((s) => s.applyTheme)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = search
    ? themes.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : themes

  const selectTheme = useCallback((theme: ThemePreview) => {
    applyTheme(theme.name)
    onClose()
  }, [applyTheme, onClose])

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        ref={containerRef}
        className="fixed z-[70] flex h-[400px] w-[280px] flex-col overflow-hidden rounded-xl border border-[var(--nana-border)] bg-[var(--nana-surface)] shadow-xl"
        style={{ left: anchorX, top: anchorY }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <div className="shrink-0 border-b border-[var(--nana-border)] px-2.5 py-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search themes"
            className="w-full rounded-md bg-[var(--nana-bg)] px-2 py-1 text-xs text-[var(--nana-fg)] placeholder-[var(--nana-fg-dim)] outline-none focus:ring-1 focus:ring-blue-500/50"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-8 text-xs text-[var(--nana-fg-dim)]">
              No themes found
            </div>
          )}
          {filtered.map((theme) => {
            const isActive = theme.name === currentThemeName
            return (
              <button
                key={theme.name}
                type="button"
                onClick={() => selectTheme(theme)}
                className="flex w-full flex-col gap-1 px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--nana-hover)]"
              >
                <div className="flex items-center gap-1">
                  <span className="flex-1 truncate text-[11px] text-[var(--nana-fg)]">
                    {theme.name}
                  </span>
                  {isActive && (
                    <Check size={9} className="text-[var(--nana-accent)]" />
                  )}
                </div>
                <div className="flex items-center overflow-hidden rounded-[3px] border border-[var(--nana-border)]">
                  <div
                    className="flex h-[14px] w-6 shrink-0 items-center justify-center"
                    style={{ backgroundColor: theme.background }}
                  >
                    <span
                      className="text-[9px] font-medium"
                      style={{ color: theme.foreground, fontFamily: 'monospace' }}
                    >
                      Ab
                    </span>
                  </div>
                  {theme.palette.map((color, i) => (
                    <div
                      key={i}
                      className="h-[14px] flex-1"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
