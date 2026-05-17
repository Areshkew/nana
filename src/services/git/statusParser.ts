// Original: Muxy/Services/Git/GitStatusParser.swift
// Description: Parses git status --porcelain=v1 -z output and git diff --numstat
// Status: Completed

import type { GitStatusFile } from './diffTypes'

export interface NumstatEntry {
  additions: number | null
  deletions: number | null
  isBinary: boolean
}

export function parseNumstat(output: string): Map<string, NumstatEntry> {
  const stats = new Map<string, NumstatEntry>()

  for (const line of output.split('\n')) {
    if (!line.trim()) continue
    const fields = line.split('\t')
    if (fields.length < 3) continue

    const addsToken = fields[0]
    const delsToken = fields[1]
    const rawPath = fields[2]

    const additions = addsToken === '-' ? null : Number.parseInt(addsToken, 10) || null
    const deletions = delsToken === '-' ? null : Number.parseInt(delsToken, 10) || null
    const isBinary = addsToken === '-' || delsToken === '-'
    const entry: NumstatEntry = { additions, deletions, isBinary }

    const normalizedPath = normalizeNumstatPath(rawPath)
    stats.set(normalizedPath, entry)
    if (normalizedPath !== rawPath) {
      stats.set(rawPath, entry)
    }
  }

  return stats
}

function normalizeNumstatPath(rawPath: string): string {
  const braceStart = rawPath.indexOf('{')
  const braceEnd = rawPath.lastIndexOf('}')
  const arrowIdx = rawPath.indexOf(' => ')

  if (braceStart >= 0 && braceEnd > braceStart && arrowIdx > braceStart && arrowIdx < braceEnd) {
    const prefix = rawPath.slice(0, braceStart)
    const suffix = rawPath.slice(braceEnd + 1)
    const right = rawPath.slice(arrowIdx + 4, braceEnd)
    return prefix + right + suffix
  }

  if (arrowIdx >= 0) {
    return rawPath.slice(arrowIdx + 4)
  }

  return rawPath
}

export function parseStatusPorcelain(
  data: Uint8Array,
  stats: Map<string, NumstatEntry>,
): GitStatusFile[] {
  const decoded = new TextDecoder().decode(data)
  if (!decoded) return []

  const tokens = decoded.split('\0').filter((t) => t.length > 0)
  const files: GitStatusFile[] = []
  let index = 0

  while (index < tokens.length) {
    const token = tokens[index]
    if (token.length < 4) {
      index += 1
      continue
    }

    const xStatus = token[0]
    const yStatus = token[1]
    const path = token.slice(3)

    if (xStatus === 'R' || xStatus === 'C' || yStatus === 'R' || yStatus === 'C') {
      const newPath = index + 1 < tokens.length ? tokens[index + 1] : path
      const stat = stats.get(newPath)
      const stagedSet = new Set<string>(['A', 'M', 'D', 'R', 'C'])
      files.push({
        path: newPath,
        oldPath: path,
        xStatus,
        yStatus,
        additions: stat?.additions ?? null,
        deletions: stat?.deletions ?? null,
        isBinary: stat?.isBinary ?? false,
        isStaged: stagedSet.has(xStatus),
        isUnstaged: computeIsUnstaged(xStatus, yStatus),
      })
      index += 2
      continue
    }

    const stat = stats.get(path)
    const stagedSet2 = new Set<string>(['A', 'M', 'D', 'R', 'C'])
    files.push({
      path,
      oldPath: null,
      xStatus,
      yStatus,
      additions: stat?.additions ?? null,
      deletions: stat?.deletions ?? null,
      isBinary: stat?.isBinary ?? false,
      isStaged: stagedSet2.has(xStatus),
      isUnstaged: computeIsUnstaged(xStatus, yStatus),
    })
    index += 1
  }

  files.sort((a, b) => a.path.localeCompare(b.path))
  return files
}

function computeIsUnstaged(xStatus: string, yStatus: string): boolean {
  const unstagedSet = new Set<string>(['M', 'D', '?'])
  return unstagedSet.has(yStatus) || (xStatus === '?' && yStatus === '?')
}
