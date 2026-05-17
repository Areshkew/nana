// Original: xterm.js/src/browser/selection/SelectionModel.ts (adapted for pane-virtual rows)
// Description: Selection model wrapper for split diff panes. Maps each visible line
//              in left/right panes to a virtual row index so SelectionModel can be reused.
// Status: Completed

import { SelectionModel, getWordBounds, extractSelectionText, type SelectionRange } from './selectionModel'
import type { DiffDisplayRow } from '../../services/git/diffTypes'

export interface VirtualRowMapEntry {
  blockIndex: number
  lineIndex: number
  y: number
  row: DiffDisplayRow
}

export function buildVirtualRowMap(
  layout: { kind: string; y: number; leftRows?: DiffDisplayRow[]; rightRows?: DiffDisplayRow[] }[],
  pane: 'left' | 'right',
): VirtualRowMapEntry[] {
  const map: VirtualRowMapEntry[] = []
  for (let b = 0; b < layout.length; b++) {
    const item = layout[b]
    if (item.kind !== 'codeBlock') continue
    const rows = pane === 'left' ? item.leftRows : item.rightRows
    if (!rows) continue
    for (let l = 0; l < rows.length; l++) {
      map.push({ blockIndex: b, lineIndex: l, y: item.y + l * 20, row: rows[l] })
    }
  }
  return map
}

export function findVirtualRow(
  map: VirtualRowMapEntry[],
  y: number,
  lineHeight: number,
): number | null {
  // Binary search would be optimal, but linear is fine for typical diffs
  for (let i = 0; i < map.length; i++) {
    if (y >= map[i].y && y < map[i].y + lineHeight) {
      return i
    }
  }
  return null
}

export function findVirtualRowByBlockLine(
  map: VirtualRowMapEntry[],
  blockIndex: number,
  lineIndex: number,
): number | null {
  for (let i = 0; i < map.length; i++) {
    if (map[i].blockIndex === blockIndex && map[i].lineIndex === lineIndex) {
      return i
    }
  }
  return null
}

export { SelectionModel, getWordBounds, extractSelectionText, type SelectionRange }
