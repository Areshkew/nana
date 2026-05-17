// Original: Muxy/Views/Settings/GeneralSettingsView.swift
// Description: General settings tab with lifecycle and tab close preferences.
// Status: ✅ Completed

import { useSettingsStore } from '../../stores/settingsStore'
import { SettingsContainer, SettingsSection, SettingsToggleRow } from './SettingsComponents'

export function GeneralSettingsView(): JSX.Element {
  const keepOpen = useSettingsStore((s) => s.keepOpenWhenNoTabs)
  const confirmRunning = useSettingsStore((s) => s.confirmCloseRunningProcess)
  const autoExpand = useSettingsStore((s) => s.autoExpandWorktreesOnProjectSwitch)

  return (
    <SettingsContainer>
      <SettingsSection title="General">
        <SettingsToggleRow
          label="Auto-expand worktrees on project switch"
          value={autoExpand}
          onChange={useSettingsStore.getState().setAutoExpandWorktreesOnProjectSwitch}
        />
      </SettingsSection>

      <SettingsSection title="Projects">
        <SettingsToggleRow
          label="Keep projects open after closing the last tab"
          value={keepOpen}
          onChange={useSettingsStore.getState().setKeepOpenWhenNoTabs}
        />
      </SettingsSection>

      <SettingsSection title="Tabs" showsDivider={false}>
        <SettingsToggleRow
          label="Confirm before closing a tab with a running process"
          value={confirmRunning}
          onChange={useSettingsStore.getState().setConfirmCloseRunningProcess}
        />
      </SettingsSection>
    </SettingsContainer>
  )
}
