// Original: Muxy/Services/Git/GitModels.swift — DiffDisplayRow, GitStatusFile
// Description: TypeScript types for diff rendering and git status
// Status: Completed

export type DiffRowKind = 'hunk' | 'context' | 'addition' | 'deletion' | 'collapsed'

export interface DiffDisplayRow {
  kind: DiffRowKind
  oldLineNumber: number | null
  newLineNumber: number | null
  oldText: string | null
  newText: string | null
  text: string
}

export interface ParsedDiff {
  rows: DiffDisplayRow[]
  additions: number
  deletions: number
  truncated: boolean
}

export interface GitStatusFile {
  path: string
  oldPath: string | null
  xStatus: string
  yStatus: string
  additions: number | null
  deletions: number | null
  isBinary: boolean
  isStaged: boolean
  isUnstaged: boolean
}
