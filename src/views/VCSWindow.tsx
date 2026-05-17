// Original: Muxy/Views/VCS/VCSTabView.swift (separate window variant)
// Description: Standalone VCS window — renders VCSTabView in its own Electron BrowserWindow.
//              Loaded when the URL has ?view=vcs&repoPath=... query parameters.
// Status: ✅ Completed

import { useMountEffect } from '../hooks/useMountEffect'
import { useThemeStore } from '../stores/themeStore'
import { useSettingsStore } from '../stores/settingsStore'
import { VCSTabView } from '../components/VCS/VCSTabView'

export function VCSWindow(): JSX.Element {
  const params = new URLSearchParams(window.location.search)
  const repoPath = params.get('repoPath') ?? ''

  useMountEffect(() => {
    void useSettingsStore.getState().load()
    void useThemeStore.getState().loadThemes()
  })

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--nana-bg)]">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 38,
          padding: '0 12px',
          borderBottom: '1px solid var(--nana-border)',
          WebkitAppRegion: 'drag',
          flexShrink: 0,
        } as React.CSSProperties}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--nana-fg)' }}>
          Source Control
        </span>
        <span style={{ fontSize: 10, color: 'var(--nana-fg-dim)', marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {repoPath}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <VCSTabView repoPath={repoPath} />
      </div>
    </div>
  )
}
