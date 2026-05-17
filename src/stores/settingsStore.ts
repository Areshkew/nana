// Original: Muxy/Models/ProjectLifecyclePreferences.swift + Muxy/Models/TabCloseConfirmationPreferences.swift
// Description: Settings store with file-backed persistence for all app preferences.
// Status: Completed

import { create } from 'zustand'
import { loadSettings, saveSettings, type SettingsData } from '../services/persistence'

interface SettingsState extends SettingsData {
  loaded: boolean
  setKeepOpenWhenNoTabs: (value: boolean) => void
  setConfirmCloseRunningProcess: (value: boolean) => void
  setAutoExpandWorktreesOnProjectSwitch: (value: boolean) => void
  setWindowTransparency: (value: number) => void
  setVcsDisplayMode: (value: string) => void
  setDefaultEditor: (value: string) => void
  setExternalEditorCommand: (value: string) => void
  setEditorFontFamily: (value: string) => void
  setEditorFontSize: (value: number) => void
  setThemeName: (value: string | null) => void
  load: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, _get) => ({
  keepOpenWhenNoTabs: false,
  confirmCloseRunningProcess: true,
  autoExpandWorktreesOnProjectSwitch: true,
  windowTransparency: 1.0,
  vcsDisplayMode: 'attached',
  defaultEditor: 'builtin',
  externalEditorCommand: 'vim',
  editorFontFamily: 'JetBrains Mono',
  editorFontSize: 13,
  themeName: null,
  loaded: false,

  setKeepOpenWhenNoTabs: (value: boolean) => {
    set({ keepOpenWhenNoTabs: value })
    void flush()
  },

  setConfirmCloseRunningProcess: (value: boolean) => {
    set({ confirmCloseRunningProcess: value })
    void flush()
  },

  setAutoExpandWorktreesOnProjectSwitch: (value: boolean) => {
    set({ autoExpandWorktreesOnProjectSwitch: value })
    void flush()
  },

  setWindowTransparency: (value: number) => {
    set({ windowTransparency: value })
    void flush()
  },

  setVcsDisplayMode: (value: string) => {
    set({ vcsDisplayMode: value })
    void import('../stores/rightPanelStore').then(({ useRightPanelStore }) => {
      const rp = useRightPanelStore.getState()
      if (value === 'attached') {
        if (!rp.visible || rp.activePanel !== 'vcs') {
          rp.toggleVCS()
        }
      } else {
        if (rp.activePanel === 'vcs') rp.close()
      }
    })
    void flush()
  },

  setDefaultEditor: (value: string) => {
    set({ defaultEditor: value })
    void flush()
  },

  setExternalEditorCommand: (value: string) => {
    set({ externalEditorCommand: value })
    void flush()
  },

  setEditorFontFamily: (value: string) => {
    set({ editorFontFamily: value })
    void flush()
  },

  setEditorFontSize: (value: number) => {
    set({ editorFontSize: value })
    void flush()
  },

  setThemeName: (value: string | null) => {
    set({ themeName: value })
    void flush()
  },

  load: async () => {
    if (_get().loaded) return
    const data = await loadSettings()
    set({ ...data, loaded: true })
  },
}))

function flush(): void {
  const s = useSettingsStore.getState()
  void saveSettings({
    keepOpenWhenNoTabs: s.keepOpenWhenNoTabs,
    confirmCloseRunningProcess: s.confirmCloseRunningProcess,
    autoExpandWorktreesOnProjectSwitch: s.autoExpandWorktreesOnProjectSwitch,
    windowTransparency: s.windowTransparency,
    vcsDisplayMode: s.vcsDisplayMode,
    defaultEditor: s.defaultEditor,
    externalEditorCommand: s.externalEditorCommand,
    editorFontFamily: s.editorFontFamily,
    editorFontSize: s.editorFontSize,
    themeName: s.themeName,
  })
}
