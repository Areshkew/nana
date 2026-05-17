// Original: Muxy/Views/Workspace/TabStrip.swift
// Description: Shared tab strip types to avoid fast-refresh warnings.
// Status: ✅ Completed

import { type TerminalTab, getTabTitle } from '../../models/tab'

export interface TabSnapshot {
  id: string
  title: string
  kind: import('../../models/tab').TabKind
  isPinned: boolean
  hasCustomTitle: boolean
  colorID: string | null
}

export function makeSnapshot(tab: TerminalTab): TabSnapshot {
  return {
    id: tab.id,
    title: getTabTitle(tab),
    kind: tab.content.kind,
    isPinned: tab.isPinned,
    hasCustomTitle: tab.customTitle !== null,
    colorID: tab.colorID,
  }
}
