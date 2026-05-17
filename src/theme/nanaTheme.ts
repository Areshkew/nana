// Original: Muxy/Theme/MuxyTheme.swift
// Description: Semantic color derivation from Ghostty palette for UI components.
// Status: ✅ Completed

import type { ThemePreview } from '../services/themeService'

export interface NanaThemeSnapshot {
  bg: string
  fg: string
  fgMuted: string
  fgDim: string
  surface: string
  border: string
  hover: string
  accent: string
  accentSoft: string
  diffAddFg: string
  diffRemoveFg: string
  diffHunkFg: string
  diffAddBg: string
  diffRemoveBg: string
  diffHunkBg: string
  selectionBg: string
  colorScheme: 'light' | 'dark'
}

function hexToRgb(hex: string): [number, number, number] | null {
  if (!hex.startsWith('#') || hex.length !== 7) return null
  const val = Number.parseInt(hex.slice(1), 16)
  if (Number.isNaN(val)) return null
  return [(val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF]
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function buildXtermTheme(theme: ThemePreview): Record<string, string> {
  const result: Record<string, string> = {
    background: theme.background,
    foreground: theme.foreground,
    cursor: theme.cursorColor ?? theme.foreground,
    cursorAccent: theme.foreground,
    selectionBackground: theme.selectionBackground ?? withAlpha(theme.foreground, 0.3),
    selectionForeground: theme.foreground,
  }

  const paletteNames = [
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
    'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
  ]

  for (let i = 0; i < 16; i++) {
    result[paletteNames[i]] = theme.palette[i]
  }

  return result
}

export function snapshotFromTheme(theme: ThemePreview): NanaThemeSnapshot {
  const fg = theme.foreground
  const bg = theme.background
  const palette = theme.palette

  const accentColor = palette[13] ?? palette[4] ?? palette[5] ?? '#C370D3'
  const addColor = palette[2] ?? '#34d399'
  const removeColor = palette[1] ?? '#EC4899'
  const hunkColor = palette[6] ?? accentColor

  return {
    bg,
    fg,
    fgMuted: withAlpha(fg, 0.65),
    fgDim: withAlpha(fg, 0.4),
    surface: withAlpha(fg, 0.08),
    border: withAlpha(fg, 0.12),
    hover: withAlpha(fg, 0.06),
    accent: accentColor,
    accentSoft: withAlpha(accentColor, 0.1),
    diffAddFg: addColor,
    diffRemoveFg: removeColor,
    diffHunkFg: hunkColor,
    diffAddBg: withAlpha(addColor, 0.16),
    diffRemoveBg: withAlpha(removeColor, 0.16),
    diffHunkBg: withAlpha(hunkColor, 0.1),
    selectionBg: theme.selectionBackground ?? withAlpha(theme.foreground, 0.3),
    colorScheme: luminance(bg) > 0.5 ? 'light' : 'dark',
  }
}

export function applyThemeToCSS(snapshot: NanaThemeSnapshot): void {
  const root = document.documentElement
  root.style.setProperty('--nana-bg', snapshot.bg)
  root.style.setProperty('--nana-fg', snapshot.fg)
  root.style.setProperty('--nana-fg-muted', snapshot.fgMuted)
  root.style.setProperty('--nana-fg-dim', snapshot.fgDim)
  root.style.setProperty('--nana-surface', snapshot.surface)
  root.style.setProperty('--nana-border', snapshot.border)
  root.style.setProperty('--nana-hover', snapshot.hover)
  root.style.setProperty('--nana-accent', snapshot.accent)
  root.style.setProperty('--nana-accent-soft', snapshot.accentSoft)
  root.style.setProperty('--nana-diff-add-fg', snapshot.diffAddFg)
  root.style.setProperty('--nana-diff-remove-fg', snapshot.diffRemoveFg)
  root.style.setProperty('--nana-diff-hunk-fg', snapshot.diffHunkFg)
  root.style.setProperty('--nana-diff-add-bg', snapshot.diffAddBg)
  root.style.setProperty('--nana-diff-remove-bg', snapshot.diffRemoveBg)
  root.style.setProperty('--nana-diff-hunk-bg', snapshot.diffHunkBg)
  root.style.setProperty('--nana-selection-bg', snapshot.selectionBg)
}

export { buildXtermTheme }
