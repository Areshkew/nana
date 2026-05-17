// Original: Muxy/Views/Settings/KeyboardShortcutsSettingsView.swift
// Description: Keyboard shortcuts settings — search, categorized list, recording.
// Status: ✅ Completed

import { useState, useCallback } from 'react'
import { SettingsContainer, SettingsSection, SettingsRow } from './SettingsComponents'
import {
  ShortcutAction,
  defaultBindings,
  type KeyBinding,
  type ShortcutActionDef,
} from '../../models/keyBinding'
import { comboDisplayString, type KeyCombo } from '../../models/keyCombo'
import { RotateCcw } from 'lucide-react'

const bindingsRef = { current: [...defaultBindings] }

function getBindingForAction(action: ShortcutActionDef): KeyBinding {
  const existing = bindingsRef.current.find((b) => b.action.id === action.id)
  return existing ?? { action, combo: { key: '', modifiers: 0 } }
}

function findConflict(combo: KeyCombo, excludeActionId: string): ShortcutActionDef | null {
  if (!combo.key) return null
  for (const binding of bindingsRef.current) {
    if (binding.action.id === excludeActionId) continue
    if (binding.combo.key === combo.key && binding.combo.modifiers === combo.modifiers) {
      return binding.action
    }
  }
  return null
}

function ShortcutRecorder({
  combo,
  onRecord,
}: {
  combo: KeyCombo
  onRecord: (combo: KeyCombo) => void
}): JSX.Element {
  const [recording, setRecording] = useState(false)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!recording) return
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      setRecording(false)
      return
    }

    let modifiers = 0
    if (e.ctrlKey) modifiers |= 1
    if (e.altKey) modifiers |= 2
    if (e.shiftKey) modifiers |= 4
    if (e.metaKey) modifiers |= 8

    if (modifiers === 0) return

    let key: string
    switch (e.key) {
      case 'ArrowLeft': key = 'leftarrow'; break
      case 'ArrowRight': key = 'rightarrow'; break
      case 'ArrowUp': key = 'uparrow'; break
      case 'ArrowDown': key = 'downarrow'; break
      default:
        key = e.key.length === 1 ? e.key.toLowerCase() : ''
        if (!key) return
        break
    }

    onRecord({ key, modifiers })
    setRecording(false)
  }, [recording, onRecord])

  return (
    <div
      tabIndex={recording ? 0 : undefined}
      onKeyDown={recording ? handleKeyDown : undefined}
      onBlur={() => setRecording(false)}
      onClick={() => { setRecording(true) }}
      className={`flex h-6 min-w-[80px] cursor-pointer items-center justify-center rounded-md border px-2 text-xs transition-colors ${
        recording
          ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
          : 'border-[var(--nana-border)] text-[var(--nana-fg-dim)] hover:border-[var(--nana-fg)] hover:text-[var(--nana-fg-muted)]'
      }`}
      role="button"
    >
      {recording
        ? 'Press shortcut…'
        : combo.key
          ? comboDisplayString(combo)
          : '—'}
    </div>
  )
}

export function KeyboardShortcutsSettingsView(): JSX.Element {
  const [search, setSearch] = useState('')
  const [, setRevision] = useState(0)

  const refresh = useCallback(() => setRevision((n) => n + 1), [])

  const filteredCategories = search
    ? ShortcutAction.categories.filter((cat) => {
        const catActions = ShortcutAction.allForCategory(cat)
        return catActions.some((a) =>
          a.displayName.toLowerCase().includes(search.toLowerCase())
        )
      })
    : ShortcutAction.categories

  return (
    <SettingsContainer>
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shortcuts"
          className="flex-1 rounded-md border border-[var(--nana-border)] bg-[var(--nana-surface)] px-2.5 py-1 text-xs text-[var(--nana-fg)] placeholder-[var(--nana-fg-dim)] outline-none focus:border-blue-500/50"
        />
        <button
          type="button"
          onClick={() => {
            bindingsRef.current = defaultBindings.map((b) => ({ ...b }))
            refresh()
          }}
          className="flex h-6 items-center gap-1 rounded-md border border-[var(--nana-border)] px-2 text-[11px] text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg-muted)]"
          title="Reset All"
        >
          <RotateCcw size={10} />
          Reset All
        </button>
      </div>

      {filteredCategories.map((category) => {
        const actions = ShortcutAction.allForCategory(category).filter((a) =>
          !search || a.displayName.toLowerCase().includes(search.toLowerCase())
        )
        if (actions.length === 0) return null

        return (
          <SettingsSection key={category} title={category}>
            {actions.map((action) => (
              <ShortcutRow key={action.id} action={action} onRefresh={refresh} />
            ))}
          </SettingsSection>
        )
      })}
    </SettingsContainer>
  )
}

function ShortcutRow({
  action,
  onRefresh,
}: {
  action: ShortcutActionDef
  onRefresh: () => void
}): JSX.Element {
  const binding = getBindingForAction(action)
  const defaultBinding = defaultBindings.find((b) => b.action.id === action.id)
  const isCustom = defaultBinding
    ? (binding.combo.key !== defaultBinding.combo.key || binding.combo.modifiers !== defaultBinding.combo.modifiers)
    : false

  const handleRecord = useCallback((combo: KeyCombo) => {
    const conflictAction = findConflict(combo, action.id)
    if (conflictAction) return
    const existing = bindingsRef.current.findIndex((b) => b.action.id === action.id)
    if (existing >= 0) {
      bindingsRef.current[existing] = { ...bindingsRef.current[existing], combo }
    } else {
      bindingsRef.current.push({ action, combo })
    }
    onRefresh()
  }, [action, onRefresh])

  const handleReset = useCallback(() => {
    if (!defaultBinding) return
    const existing = bindingsRef.current.findIndex((b) => b.action.id === action.id)
    if (existing >= 0) {
      bindingsRef.current[existing] = { ...defaultBinding }
    }
    onRefresh()
  }, [action, defaultBinding, onRefresh])

  return (
    <SettingsRow label={action.displayName}>
      <div className="flex items-center gap-1">
        <ShortcutRecorder combo={binding.combo} onRecord={handleRecord} />
        {isCustom && (
          <button
            type="button"
            onClick={handleReset}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg-muted)]"
            title="Reset to default"
          >
            <RotateCcw size={10} />
          </button>
        )}
      </div>
    </SettingsRow>
  )
}
