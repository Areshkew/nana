// Original: N/A — theme synchronization hook
// Description: Sync xterm.js terminal theme and font when global settings change.
//              Sets individual options to avoid full renderer rebuild, and calls
//              fit() + pty.resize() after font metric changes.
// Status: ✅ Completed

import { useEffect, useRef } from 'react'
import type { Terminal } from 'xterm'
import type { FitAddon } from 'xterm-addon-fit'
import { useThemeStore } from '../stores/themeStore'
import { useSettingsStore } from '../stores/settingsStore'
import type { PtySession } from '../services/ptyService'

export const fallbackTheme = {
  background: '#1a1a1a',
  foreground: '#e0e0e0',
  cursor: '#e0e0e0',
  selectionBackground: '#264f78',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4f',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
}

interface ThemeSyncRefs {
  fitAddonRef: React.RefObject<FitAddon | null>
  ptyRef: React.RefObject<PtySession | null>
}

export function useThemeSync(
  terminalRef: React.RefObject<Terminal | null>,
  refs?: ThemeSyncRefs,
): void {
  const xtermTheme = useThemeStore((s) => s.xtermTheme)
  const fontFamily = useSettingsStore((s) => s.editorFontFamily)
  const fontSize = useSettingsStore((s) => s.editorFontSize)
  const prevFontSizeRef = useRef(fontSize)

  useEffect(() => {
    const term = terminalRef.current
    if (!term) return

    term.options.theme = xtermTheme ?? fallbackTheme
    term.options.fontFamily = `${fontFamily}, monospace`
    term.options.fontSize = fontSize

    if (prevFontSizeRef.current !== fontSize && refs) {
      prevFontSizeRef.current = fontSize
      const fitAddon = refs.fitAddonRef.current
      const pty = refs.ptyRef.current
      if (fitAddon) {
        try {
          const prevCols = term.cols
          const prevRows = term.rows
          fitAddon.fit()
          if (pty && (term.cols !== prevCols || term.rows !== prevRows)) {
            pty.resize(term.cols, term.rows)
          }
        } catch {
          // Container may have zero dimensions
        }
      }
    }
  }, [xtermTheme, fontFamily, fontSize, terminalRef, refs])
}
