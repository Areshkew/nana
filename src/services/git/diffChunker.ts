// Original: Muxy/Views/VCS/DiffTextBridge.swift (buildDiffChunks, hunkLabel)
//           Muxy/Views/VCS/DiffComponents.swift (lineNumberWidth, maxLineNumber)
// Description: Diff chunk builder, hunk label parser, gutter sizing utilities.
// Status: ✅ Completed

import type { DiffDisplayRow } from './diffTypes'

export interface DiffChunk {
  kind: 'divider' | 'codeBlock'
  text?: string
  rows?: DiffDisplayRow[]
}

export function hunkLabel(raw: string): string {
  if (raw.length <= 2) return raw
  const closingAt = raw.indexOf('@@', 2)
  if (closingAt === -1) return raw
  const after = raw.slice(closingAt + 2).trim()
  return after || raw
}

export function buildDiffChunks(rows: DiffDisplayRow[]): DiffChunk[] {
  const chunks: DiffChunk[] = []
  let currentRows: DiffDisplayRow[] = []

  for (const row of rows) {
    if (row.kind === 'hunk' || row.kind === 'collapsed') {
      if (currentRows.length > 0) {
        chunks.push({ kind: 'codeBlock', rows: currentRows })
        currentRows = []
      }
      const label = row.kind === 'hunk' ? hunkLabel(row.text) : row.text
      chunks.push({ kind: 'divider', text: label })
    } else {
      currentRows.push(row)
    }
  }

  if (currentRows.length > 0) {
    chunks.push({ kind: 'codeBlock', rows: currentRows })
  }

  return chunks
}

export function maxLineNumber(rows: DiffDisplayRow[]): number {
  let max = 0
  for (const row of rows) {
    if (row.oldLineNumber !== null && row.oldLineNumber > max) max = row.oldLineNumber
    if (row.newLineNumber !== null && row.newLineNumber > max) max = row.newLineNumber
  }
  return max
}

export function lineNumberWidth(maxNum: number): number {
  const digitCount = Math.max(String(maxNum).length, 1)
  return digitCount * 8 + 12
}

const DIFF_FONT = '12px "JetBrains Mono", "Cascadia Code", "Fira Code", monospace'
let _cachedCharWidth: number | null = null

export function measureCharWidth(): number {
  if (_cachedCharWidth !== null) return _cachedCharWidth
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  if (!ctx) { _cachedCharWidth = 7.2; return _cachedCharWidth }
  ctx.font = DIFF_FONT
  _cachedCharWidth = ctx.measureText('W').width
  return _cachedCharWidth
}

export function maxLineTextLength(rows: DiffDisplayRow[]): number {
  let max = 0
  for (const row of rows) {
    const displayLen = row.text.length > 1 ? row.text.length - 1 : row.text.length
    if (displayLen > max) max = displayLen
  }
  return max
}
