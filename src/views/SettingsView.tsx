// Original: Muxy/Views/Settings/SettingsView.swift
// Description: Settings modal with tab navigation (General, Appearance, Editor, Shortcuts).
// Status: ✅ Completed

import { useState, useCallback } from 'react'
import { GeneralSettingsView } from '../components/Settings/GeneralSettingsView'
import { AppearanceSettingsView } from '../components/Settings/AppearanceSettingsView'
import { EditorSettingsView } from '../components/Settings/EditorSettingsView'
import { KeyboardShortcutsSettingsView } from '../components/Settings/KeyboardShortcutsSettingsView'
import { Settings, X, Palette, Pencil, Keyboard } from 'lucide-react'

interface SettingsTab {
  id: string
  label: string
  icon: React.ElementType<{ size?: number | string; className?: string }>
}

const TABS: SettingsTab[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'editor', label: 'Editor', icon: Pencil },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
]

interface SettingsViewProps {
  onClose: () => void
  initialTab?: string
}

export function SettingsView({ onClose, initialTab }: SettingsViewProps): JSX.Element {
  const [activeTab, setActiveTab] = useState(initialTab ?? 'general')

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="flex h-[500px] w-[660px] overflow-hidden rounded-xl border border-[var(--nana-border)] bg-[var(--nana-bg)] shadow-2xl"
        role="dialog"
        aria-label="Settings"
      >
        <nav className="flex w-[160px] shrink-0 flex-col border-r border-[var(--nana-border)] bg-black/10">
          <div className="flex h-10 items-center gap-2 px-3">
            <Settings size={13} className="text-[var(--nana-fg-dim)]" />
            <span className="text-[11px] font-semibold text-[var(--nana-fg-dim)]">Settings</span>
          </div>
          <div className="flex-1 px-1.5 py-1">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-500/10 font-medium text-blue-300'
                      : 'text-[var(--nana-fg-muted)] hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg)]'
                  }`}
                >
                  <Icon size={13} className="shrink-0" />
                  {tab.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-end p-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg-muted)]"
              title="Close Settings"
              aria-label="Close Settings"
            >
              <X size={14} />
            </button>
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          {activeTab === 'general' && <GeneralSettingsView />}
          {activeTab === 'appearance' && <AppearanceSettingsView />}
          {activeTab === 'editor' && <EditorSettingsView />}
          {activeTab === 'shortcuts' && <KeyboardShortcutsSettingsView />}
        </div>
      </div>
    </div>
  )
}
