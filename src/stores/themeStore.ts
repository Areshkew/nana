// Original: Muxy/Services/ThemeService.swift (singleton portion)
// Description: Zustand store for current theme state, application, and CSS updates.
// Status: ✅ Completed

import { create } from 'zustand'
import { type ThemePreview, discoverThemes, parseThemeFile } from '../services/themeService'
import { BUNDLED_THEMES } from '../theme/bundledThemes'
import { snapshotFromTheme, applyThemeToCSS, buildXtermTheme, type NanaThemeSnapshot } from '../theme/nanaTheme'

interface ThemeState {
  themes: ThemePreview[]
  currentThemeName: string | null
  snapshot: NanaThemeSnapshot | null
  xtermTheme: Record<string, string> | null
  loaded: boolean
  loadThemes: () => Promise<void>
  applyTheme: (name: string) => void
}

const DEFAULT_SNAPSHOT: NanaThemeSnapshot = snapshotFromTheme({
  name: 'Default',
  background: '#1a1a1a',
  foreground: '#e0e0e0',
  palette: [
    '#000000', '#cd3131', '#0dbc79', '#e5e510',
    '#2472c8', '#bc3fbc', '#11a8cd', '#e5e5e5',
    '#666666', '#f14c4f', '#23d18b', '#f5f543',
    '#3b8eea', '#d670d6', '#29b8db', '#e5e5e5',
  ],
  cursorColor: null,
  selectionBackground: null,
})

export const useThemeStore = create<ThemeState>((set, get) => ({
  themes: [],
  currentThemeName: null,
  snapshot: DEFAULT_SNAPSHOT,
  xtermTheme: null,
  loaded: false,

  loadThemes: async () => {
    if (get().loaded) return
    const themes = await discoverThemes()

    const { useSettingsStore } = await import('../stores/settingsStore')
    const { themeName } = useSettingsStore.getState()

    const name = themeName ?? 'Nana'
    const theme = themes.find((t) => t.name === name)
    const snapshot = theme ? snapshotFromTheme(theme) : DEFAULT_SNAPSHOT
    const xtermTheme = theme ? buildXtermTheme(theme) : null
    applyThemeToCSS(snapshot)
    set({ themes, currentThemeName: theme ? name : null, snapshot, xtermTheme, loaded: true })
  },

  applyTheme: (name: string) => {
    const themes = get().themes
    let theme: ThemePreview | undefined = themes.find((t) => t.name === name)

    if (!theme) {
      const bundledContent = BUNDLED_THEMES[name]
      if (bundledContent) {
        theme = parseThemeFile(bundledContent, name) ?? undefined
      }
    }

    if (!theme) return

    const snapshot = snapshotFromTheme(theme)
    const xtermTheme = buildXtermTheme(theme)
    applyThemeToCSS(snapshot)

    void import('../stores/settingsStore').then(({ useSettingsStore }) => {
      useSettingsStore.getState().setThemeName(name)
    })

    set({ currentThemeName: name, snapshot, xtermTheme })
  },
}))
