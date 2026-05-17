// Original: Muxy/Models/KeyCombo.swift
// Description: Key combination model with cross-platform key normalization and display.
// Status: ✅ Completed

export type ShortcutScope = 'global' | 'mainWindow'

export interface KeyCombo {
  key: string
  modifiers: number
}

export const ModifierFlags = {
  control: 1 << 0,
  alt: 1 << 1,
  shift: 1 << 2,
  meta: 1 << 3,
} as const

export const ARROW_KEYS = {
  left: 'leftarrow',
  right: 'rightarrow',
  up: 'uparrow',
  down: 'downarrow',
} as const

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
}

export function comboDisplayString(combo: KeyCombo): string {
  const parts: string[] = []
  const mac = isMac()

  if (combo.modifiers & ModifierFlags.control) parts.push(mac ? '⌃' : 'Ctrl')
  if (combo.modifiers & ModifierFlags.alt) parts.push(mac ? '⌥' : 'Alt')
  if (combo.modifiers & ModifierFlags.shift) parts.push(mac ? '⇧' : 'Shift')
  if (combo.modifiers & ModifierFlags.meta) parts.push(mac ? '⌘' : 'Cmd')

  let keyDisplay: string
  switch (combo.key) {
    case ARROW_KEYS.left: keyDisplay = '←'; break
    case ARROW_KEYS.right: keyDisplay = '→'; break
    case ARROW_KEYS.up: keyDisplay = '↑'; break
    case ARROW_KEYS.down: keyDisplay = '↓'; break
    default: keyDisplay = combo.key.toUpperCase(); break
  }
  parts.push(keyDisplay)
  return parts.join('')
}

export function normalizeKeyFromEvent(e: KeyboardEvent): string | null {
  if (e.key === 'Escape') return null

  if (e.key === 'ArrowLeft') return ARROW_KEYS.left
  if (e.key === 'ArrowRight') return ARROW_KEYS.right
  if (e.key === 'ArrowUp') return ARROW_KEYS.up
  if (e.key === 'ArrowDown') return ARROW_KEYS.down

  if (e.key.length === 1) return e.key.toLowerCase()
  return null
}

export function modifiersFromEvent(e: KeyboardEvent): number {
  let flags = 0
  if (e.ctrlKey) flags |= ModifierFlags.control
  if (e.altKey) flags |= ModifierFlags.alt
  if (e.shiftKey) flags |= ModifierFlags.shift
  if (e.metaKey) flags |= ModifierFlags.meta
  return flags
}

export function primaryModifier(): number {
  return isMac() ? ModifierFlags.meta : ModifierFlags.control
}

export function comboFromEvent(e: KeyboardEvent): KeyCombo | null {
  const modifiers = modifiersFromEvent(e)
  if (modifiers === 0) return null
  const key = normalizeKeyFromEvent(e)
  if (!key) return null
  return { key, modifiers }
}
