// Original: Muxy/Models/VCSDisplayMode.swift
// Description: VCS display mode enum — controls how the VCS panel opens (tab, window, or attached sidebar).
//              Defaults to .attached per original. Persisted to localStorage.
// Status: Completed

export type VCSDisplayModeValue = 'tab' | 'window' | 'attached'

const STORAGE_KEY = 'nana.vcsDisplayMode'

export interface VCSDisplayMode {
  value: VCSDisplayModeValue
  title: string
}

export const VCS_DISPLAY_MODES: Record<VCSDisplayModeValue, VCSDisplayMode> = {
  tab: { value: 'tab', title: 'Tab' },
  window: { value: 'window', title: 'Window' },
  attached: { value: 'attached', title: 'Attached' },
}

export function loadVCSDisplayMode(): VCSDisplayModeValue {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && (raw === 'tab' || raw === 'window' || raw === 'attached')) {
      return raw
    }
  } catch { /* empty */ }
  return 'attached'
}

export function saveVCSDisplayMode(value: VCSDisplayModeValue): void {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch { /* empty */ }
}
