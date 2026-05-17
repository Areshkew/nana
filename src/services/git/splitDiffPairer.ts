// Original: Muxy/Views/VCS/SplitDiffView.swift (SplitDiffPairedRow.pair, buildSplitDiffChunks)
// Description: Pairs unified diff rows into side-by-side (left/right) pairs for split diff
//              rendering. Groups adjacent deletions+additions, pads with context rows.
// Status: ✅ Completed

import type { DiffDisplayRow } from './diffTypes'
import { hunkLabel } from './diffChunker'

interface SplitDiffPairedRow {
  kind: 'content' | 'hunk' | 'collapsed'
  left: DiffDisplayRow | null
  right: DiffDisplayRow | null
}

export interface SplitChunk {
  kind: 'divider' | 'codeBlock'
  text?: string
  leftRows?: DiffDisplayRow[]
  rightRows?: DiffDisplayRow[]
}

function emptyRow(kind: DiffDisplayRow['kind']): DiffDisplayRow {
  return {
    kind,
    oldLineNumber: null,
    newLineNumber: null,
    oldText: null,
    newText: null,
    text: '',
  }
}

function padToEqualLength(
  left: DiffDisplayRow[],
  right: DiffDisplayRow[],
) {
  while (left.length < right.length) {
    left.push(emptyRow('context'))
  }
  while (right.length < left.length) {
    right.push(emptyRow('context'))
  }
}

export function pairRows(rows: DiffDisplayRow[]): SplitDiffPairedRow[] {
  const result: SplitDiffPairedRow[] = []
  let index = 0

  while (index < rows.length) {
    const row = rows[index]

    switch (row.kind) {
      case 'hunk':
        result.push({ kind: 'hunk', left: row, right: null })
        index += 1
        break

      case 'collapsed':
        result.push({ kind: 'collapsed', left: row, right: null })
        index += 1
        break

      case 'context':
        result.push({ kind: 'content', left: row, right: row })
        index += 1
        break

      case 'deletion': {
        const deletions: DiffDisplayRow[] = []
        while (index < rows.length && rows[index].kind === 'deletion') {
          deletions.push(rows[index])
          index += 1
        }
        const additions: DiffDisplayRow[] = []
        while (index < rows.length && rows[index].kind === 'addition') {
          additions.push(rows[index])
          index += 1
        }
        const maxCount = Math.max(deletions.length, additions.length)
        for (let i = 0; i < maxCount; i++) {
          result.push({
            kind: 'content',
            left: i < deletions.length ? deletions[i] : null,
            right: i < additions.length ? additions[i] : null,
          })
        }
        break
      }

      case 'addition':
        result.push({ kind: 'content', left: null, right: row })
        index += 1
        break
    }
  }

  return result
}

export function buildSplitDiffChunks(rows: DiffDisplayRow[]): SplitChunk[] {
  const paired = pairRows(rows)
  const chunks: SplitChunk[] = []
  let leftRows: DiffDisplayRow[] = []
  let rightRows: DiffDisplayRow[] = []

  for (const pair of paired) {
    if (pair.kind === 'hunk' || pair.kind === 'collapsed') {
      if (leftRows.length > 0 || rightRows.length > 0) {
        padToEqualLength(leftRows, rightRows)
        chunks.push({ kind: 'codeBlock', leftRows, rightRows })
        leftRows = []
        rightRows = []
      }
      const rawText = pair.left?.text ?? pair.right?.text ?? ''
      const label = pair.kind === 'hunk' ? hunkLabel(rawText) : rawText
      chunks.push({ kind: 'divider', text: label })
    } else {
      leftRows.push(pair.left ?? emptyRow('context'))
      rightRows.push(pair.right ?? emptyRow('context'))
    }
  }

  if (leftRows.length > 0 || rightRows.length > 0) {
    padToEqualLength(leftRows, rightRows)
    chunks.push({ kind: 'codeBlock', leftRows, rightRows })
  }

  return chunks
}
