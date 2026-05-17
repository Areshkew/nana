// Original: Muxy/Views/Settings/EditorSettingsView.swift
// Description: Editor settings tab — default editor, font family, font size.
// Status: ✅ Completed

import { useCallback } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { SettingsContainer, SettingsSection, SettingsRow } from './SettingsComponents'

const MONO_FONTS = [
  'JetBrains Mono',
  'Fira Code',
  'SF Mono',
  'Menlo',
  'Cascadia Code',
  'Source Code Pro',
  'Monaco',
  'Consolas',
  'monospace',
]

const MIN_FONT_SIZE = 8
const MAX_FONT_SIZE = 36

export function EditorSettingsView(): JSX.Element {
  const defaultEditor = useSettingsStore((s) => s.defaultEditor)
  const externalEditorCommand = useSettingsStore((s) => s.externalEditorCommand)
  const fontFamily = useSettingsStore((s) => s.editorFontFamily)
  const fontSize = useSettingsStore((s) => s.editorFontSize)

  const setDefaultEditor = useSettingsStore((s) => s.setDefaultEditor)
  const setExternalEditorCommand = useSettingsStore((s) => s.setExternalEditorCommand)
  const setEditorFontFamily = useSettingsStore((s) => s.setEditorFontFamily)
  const setEditorFontSize = useSettingsStore((s) => s.setEditorFontSize)

  const handleFontSizeChange = useCallback((delta: number) => {
    const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, fontSize + delta))
    setEditorFontSize(next)
  }, [fontSize, setEditorFontSize])

  return (
    <SettingsContainer>
      <SettingsSection title="Editor">
        <SettingsRow label="Default Editor">
          <div className="flex gap-1 rounded-md bg-[var(--nana-surface)] p-0.5">
            {(['builtin', 'terminal'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDefaultEditor(mode)}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  defaultEditor === mode
                    ? 'bg-[var(--nana-hover)] text-[var(--nana-fg)]'
                    : 'text-[var(--nana-fg-dim)] hover:text-[var(--nana-fg-muted)]'
                }`}
              >
                {mode === 'builtin' ? 'Built-in' : 'Terminal Command'}
              </button>
            ))}
          </div>
        </SettingsRow>

        {defaultEditor === 'terminal' && (
          <SettingsRow label="Editor Command">
            <input
              type="text"
              value={externalEditorCommand}
              onChange={(e) => setExternalEditorCommand(e.target.value)}
              className="h-6 w-[210px] rounded-md border border-[var(--nana-border)] bg-[var(--nana-surface)] px-2 text-xs text-[var(--nana-fg)] outline-none focus:border-blue-500/50"
            />
          </SettingsRow>
        )}
      </SettingsSection>

      <SettingsSection title="Appearance" showsDivider={false}>
        <SettingsRow label="Font Family">
          <select
            value={fontFamily}
            onChange={(e) => setEditorFontFamily(e.target.value)}
            className="h-6 w-[210px] rounded-md border border-[var(--nana-border)] bg-[var(--nana-surface)] px-2 text-xs text-[var(--nana-fg)] outline-none focus:border-blue-500/50"
          >
            {MONO_FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </SettingsRow>

        <SettingsRow label="Font Size">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={fontSize <= MIN_FONT_SIZE}
              onClick={() => handleFontSizeChange(-1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-[var(--nana-border)] text-xs text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] disabled:opacity-30"
            >
              -
            </button>
            <span className="w-6 text-center text-xs font-mono text-[var(--nana-fg)]">{fontSize}</span>
            <button
              type="button"
              disabled={fontSize >= MAX_FONT_SIZE}
              onClick={() => handleFontSizeChange(1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-[var(--nana-border)] text-xs text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] disabled:opacity-30"
            >
              +
            </button>
          </div>
        </SettingsRow>
      </SettingsSection>
    </SettingsContainer>
  )
}
