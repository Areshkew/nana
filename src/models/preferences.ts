// Original: Muxy/Models/TabCloseConfirmationPreferences.swift
// Description: Preferences for tab close confirmation behavior, persisted to localStorage.
// Status: Completed

const CONFIRM_RUNNING_PROCESS_KEY = 'nana.tabs.confirmCloseRunningProcess'
const KEEP_OPEN_WHEN_NO_TABS_KEY = 'nana.projects.keepOpenWhenNoTabs'

export function shouldConfirmRunningProcess(): boolean {
  try {
    const raw = localStorage.getItem(CONFIRM_RUNNING_PROCESS_KEY)
    if (raw === null) return true
    return raw !== 'false'
  } catch {
    return true
  }
}

export function setConfirmRunningProcess(value: boolean): void {
  try {
    localStorage.setItem(CONFIRM_RUNNING_PROCESS_KEY, String(value))
  } catch { /* empty */ }
}

export function shouldKeepOpenWhenNoTabs(): boolean {
  try {
    const raw = localStorage.getItem(KEEP_OPEN_WHEN_NO_TABS_KEY)
    return raw === 'true'
  } catch {
    return false
  }
}

export function setKeepOpenWhenNoTabs(value: boolean): void {
  try {
    localStorage.setItem(KEEP_OPEN_WHEN_NO_TABS_KEY, String(value))
  } catch { /* empty */ }
}
