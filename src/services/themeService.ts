// Original: Muxy/Services/ThemeService.swift
// Description: Parse Ghostty theme files and discover available themes.
// Status: ✅ Completed

import { BUNDLED_THEMES } from '../theme/bundledThemes'

export interface ThemePreview {
  name: string
  background: string
  foreground: string
  palette: string[]
  cursorColor: string | null
  selectionBackground: string | null
}

const PINNED_THEMES = new Set(['Nana', 'Nana Light'])

function parseHex(hex: string): string | null {
  const h = hex.trim()
  if (!h.startsWith('#')) return null
  if (h.length !== 7) return null
  const val = Number.parseInt(h.slice(1), 16)
  if (Number.isNaN(val)) return null
  return h
}

function extractColor(line: string): string | null {
  const eqIndex = line.indexOf('=')
  if (eqIndex === -1) return null
  const value = line.slice(eqIndex + 1).trim()
  return parseHex(value)
}

function parsePaletteEntry(line: string, palette: Map<number, string>): void {
  const eqIndex = line.indexOf('=')
  if (eqIndex === -1) return
  const value = line.slice(eqIndex + 1).trim()
  const eqIndex2 = value.indexOf('=')
  if (eqIndex2 === -1) return
  const index = Number.parseInt(value.slice(0, eqIndex2))
  if (Number.isNaN(index) || index < 0 || index >= 16) return
  const color = parseHex(value.slice(eqIndex2 + 1))
  if (color) palette.set(index, color)
}

export function parseThemeFile(content: string, name: string): ThemePreview | null {
  let bg: string | null = null
  let fg: string | null = null
  const palette = new Map<number, string>()
  let cursorColor: string | null = null
  let selectionBackground: string | null = null

  const lines = content.split('\n')
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('background') && !line.startsWith('background-')) {
      bg = extractColor(line)
    } else if (line.startsWith('foreground') && !line.startsWith('foreground-')) {
      fg = extractColor(line)
    } else if (line.startsWith('palette')) {
      parsePaletteEntry(line, palette)
    } else if (line.startsWith('cursor-color')) {
      cursorColor = extractColor(line)
    } else if (line.startsWith('selection-background')) {
      selectionBackground = extractColor(line)
    }
  }

  if (!bg || !fg) return null

  const sortedPalette: string[] = []
  for (let i = 0; i < 16; i++) {
    sortedPalette.push(palette.get(i) ?? '#000000')
  }

  return { name, background: bg, foreground: fg, palette: sortedPalette, cursorColor, selectionBackground }
}

export async function discoverThemes(): Promise<ThemePreview[]> {
  const themesByName = new Map<string, ThemePreview>()

  for (const [name, content] of Object.entries(BUNDLED_THEMES)) {
    const theme = parseThemeFile(content, name)
    if (theme) themesByName.set(theme.name, theme)
  }

  const api = window.electronAPI
  if (!api) return sortThemes(themesByName)

  try {
    const ghosttyDir = await api.getGhosttyThemesDir()
    if (typeof ghosttyDir === 'string') {
      const dirContents = await api.listDir(ghosttyDir)
      if (Array.isArray(dirContents)) {
        for (const entry of dirContents) {
          if (typeof entry !== 'string') continue
          if (themesByName.has(entry)) continue
          const content = await api.readTextFile(`${ghosttyDir}/${entry}`)
          if (typeof content !== 'string') continue
          const theme = parseThemeFile(content, entry)
          if (theme) themesByName.set(theme.name, theme)
        }
      }
    }
  } catch {
    // System themes are optional
  }

  return sortThemes(themesByName)
}

function sortThemes(themesByName: Map<string, ThemePreview>): ThemePreview[] {
  return Array.from(themesByName.values()).sort((a, b) => {
    const aPinned = PINNED_THEMES.has(a.name) ? 0 : 1
    const bPinned = PINNED_THEMES.has(b.name) ? 0 : 1
    if (aPinned !== bPinned) return aPinned - bPinned
    if (aPinned === 0 && bPinned === 0) return a.name.localeCompare(b.name)
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}
