// Original: N/A — project infrastructure hook
// Description: Watches workspaceStore.lastEffects and kills PTYs for removed panes,
//              cleans up terminal lifecycle and scrollback, and handles project removal
//              (auto-selects next project when the active project's last tab closes).
// Status: ✅ Completed

import { useRef } from 'react'
import { useMountEffect } from './useMountEffect'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useAppStore } from '../stores/appStore'
import { destroyPtySession } from '../services/ptyService'
import { unregisterTerminalLifecycle } from '../services/terminalLifecycle'
import { scrollbackStore } from '../services/terminalScrollback'

export function usePtySideEffects(): void {
  const processedKeyRef = useRef<string>('')

  useMountEffect(() => {
    const unsubscribe = useWorkspaceStore.subscribe((state) => {
      const effects = state.lastEffects
      if (!effects) return

      const key = effects.paneIDsToRemove.join(',') + '|' + effects.projectIDsToRemove.join(',') + '|' + effects.worktreeSwitches.map((w) => w.worktreeID).join(',')
      if (key === processedKeyRef.current) return

      processedKeyRef.current = key

      for (const paneId of effects.paneIDsToRemove) {
        unregisterTerminalLifecycle(paneId)
        void scrollbackStore.remove(paneId)
        destroyPtySession(paneId)
      }

      for (const projectID of effects.projectIDsToRemove) {
        useAppStore.getState().removeProject(projectID)
      }

      for (const { projectID, worktreeID } of effects.worktreeSwitches) {
        useAppStore.setState((state) => ({
          activeWorktreeID: { ...state.activeWorktreeID, [projectID]: worktreeID },
        }))
      }

      useWorkspaceStore.setState({ lastEffects: null })
    })

    return unsubscribe
  })
}
