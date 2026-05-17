// Original: Muxy/Views/Settings/AppearanceSettingsView.swift
// Description: Appearance settings — theme picker, transparency slider, VCS display mode.
// Status: ✅ Completed

import { useCallback, useRef } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { openThemePicker, setThemePickerAnchor } from './themePickerState'
import { SettingsContainer, SettingsSection, SettingsRow } from './SettingsComponents'
import { ChevronDown } from 'lucide-react'

const MIN_ALPHA = 0.35
const MAX_ALPHA = 1.0
const STEP = 0.05

export function AppearanceSettingsView(): JSX.Element {
  const transparency = useSettingsStore((s) => s.windowTransparency)
  const vcsDisplayMode = useSettingsStore((s) => s.vcsDisplayMode)
  const themeName = useSettingsStore((s) => s.themeName)
  const setTransparency = useSettingsStore((s) => s.setWindowTransparency)
  const setVcsDisplayMode = useSettingsStore((s) => s.setVcsDisplayMode)
  const themeButtonRef = useRef<HTMLButtonElement>(null)

  const transparencyPercent = Math.round((1.0 - transparency) * 100)

  const handleTransparencyChange = useCallback((value: number) => {
    setTransparency(value)
    void window.electronAPI.setWindowOpacity(value)
  }, [setTransparency])

  return (
    <SettingsContainer>
      <SettingsSection title="Terminal">
        <SettingsRow label="Theme">
          <button
            ref={themeButtonRef}
            type="button"
            onClick={() => {
              const rect = themeButtonRef.current?.getBoundingClientRect()
              if (rect) {
                setThemePickerAnchor(rect.left, rect.bottom + 4)
              }
              openThemePicker()
            }}
            className="flex w-[210px] items-center justify-between rounded-md border border-[var(--nana-border)] bg-[var(--nana-surface)] px-3 py-1.5 text-xs text-[var(--nana-fg)] outline-none hover:border-[var(--nana-fg-dim)] focus:border-blue-500/50"
          >
            <span className={themeName ? 'text-[var(--nana-fg)]' : 'text-[var(--nana-fg-dim)]'}>
              {themeName ?? 'Default'}
            </span>
            <ChevronDown size={12} className="shrink-0 text-[var(--nana-fg-dim)]" />
          </button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Window">
        <SettingsRow label="Background Transparency">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={MIN_ALPHA}
              max={MAX_ALPHA}
              step={STEP}
              value={transparency}
              onChange={(e) => handleTransparencyChange(parseFloat(e.target.value))}
              className="h-1 w-[210px] cursor-pointer appearance-none rounded-full bg-[var(--nana-surface)] accent-blue-500"
            />
            <span className="w-9 text-right font-mono text-[11px] text-[var(--nana-fg-dim)]">{transparencyPercent}%</span>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Source Control" showsDivider={false}>
        <SettingsRow label="Display Mode">
          <div className="flex gap-1 rounded-md bg-[var(--nana-surface)] p-0.5">
            {(['tab', 'window', 'attached'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setVcsDisplayMode(mode)}
                className={`rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                  vcsDisplayMode === mode
                    ? 'bg-[var(--nana-hover)] text-[var(--nana-fg)]'
                    : 'text-[var(--nana-fg-dim)] hover:text-[var(--nana-fg-muted)]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>
    </SettingsContainer>
  )
}
