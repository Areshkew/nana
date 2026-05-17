// Original: Muxy/Services/Git/GitDiffParser.swift
// Description: Parses unified diff output into DiffDisplayRow[] with context collapsing.
//              Used in main process via IPC to avoid blocking the renderer.
// Status: ✅ Completed

import type { DiffDisplayRow, ParsedDiff, DiffRowKind } from './diffTypes'

function parseHunkHeader(line: string): { oldStart: number; newStart: number } {
  const parts = line.split(' ')
  if (parts.length < 3) return { oldStart: 0, newStart: 0 }

  const oldPart = parts[1]
  const newPart = parts[2]

  return {
    oldStart: parseHunkNumber(oldPart),
    newStart: parseHunkNumber(newPart),
  }
}

function parseHunkNumber(token: string): number {
  const cleaned = token.replace(/^[-+]+/, '')
  const first = cleaned.split(',')[0]
  return Number.parseInt(first, 10) || 0
}

export function parseDiffRows(patch: string): ParsedDiff {
  const rows: DiffDisplayRow[] = []
  let oldLineNumber = 0
  let newLineNumber = 0
  let inHunk = false
  let additions = 0
  let deletions = 0

  for (const rawLine of patch.split('\n')) {
    const line = rawLine

    if (line.startsWith('@@')) {
      inHunk = true
      const { oldStart, newStart } = parseHunkHeader(line)
      oldLineNumber = oldStart
      newLineNumber = newStart
      rows.push({
        kind: 'hunk',
        oldLineNumber: null,
        newLineNumber: null,
        oldText: null,
        newText: null,
        text: line,
      })
      continue
    }

    if (!inHunk) continue

    if (line.startsWith(' ')) {
      const content = line.slice(1)
      rows.push({
        kind: 'context',
        oldLineNumber,
        newLineNumber,
        oldText: content,
        newText: content,
        text: line,
      })
      oldLineNumber += 1
      newLineNumber += 1
      continue
    }

    if (line.startsWith('-')) {
      const content = line.slice(1)
      rows.push({
        kind: 'deletion',
        oldLineNumber,
        newLineNumber: null,
        oldText: content,
        newText: null,
        text: line,
      })
      oldLineNumber += 1
      deletions += 1
      continue
    }

    if (line.startsWith('+')) {
      const content = line.slice(1)
      rows.push({
        kind: 'addition',
        oldLineNumber: null,
        newLineNumber,
        oldText: null,
        newText: content,
        text: line,
      })
      newLineNumber += 1
      additions += 1
      continue
    }
  }

  return { rows, additions, deletions, truncated: false }
}

export function collapseContextRows(rows: DiffDisplayRow[]): DiffDisplayRow[] {
  const output: DiffDisplayRow[] = []
  let index = 0
  const LEADING_CONTEXT = 3
  const TRAILING_CONTEXT = 3
  const COLLAPSE_THRESHOLD = 12

  while (index < rows.length) {
    const row = rows[index]
    if (row.kind !== 'context') {
      output.push(row)
      index += 1
      continue
    }

    let end = index
    while (end < rows.length && rows[end].kind === 'context') {
      end += 1
    }
    const runLength = end - index

    if (runLength <= COLLAPSE_THRESHOLD) {
      for (let i = index; i < end; i++) {
        output.push(rows[i])
      }
    } else {
      const startKeepEnd = index + LEADING_CONTEXT
      const endKeepStart = end - TRAILING_CONTEXT
      for (let i = index; i < startKeepEnd; i++) {
        output.push(rows[i])
      }
      output.push({
        kind: 'collapsed',
        oldLineNumber: null,
        newLineNumber: null,
        oldText: null,
        newText: null,
        text: `${runLength - LEADING_CONTEXT - TRAILING_CONTEXT} unmodified lines`,
      })
      for (let i = endKeepStart; i < end; i++) {
        output.push(rows[i])
      }
    }
    index = end
  }

  return output
}

export type { DiffDisplayRow, ParsedDiff, DiffRowKind }
