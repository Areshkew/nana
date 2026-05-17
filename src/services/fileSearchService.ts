// Original: Muxy/Services/FileSearchService.swift
// Description: File search with fuzzy scoring and IPC-backed directory traversal.
// Status: Completed

export interface FileSearchResult {
  absolutePath: string
  relativePath: string
  fileName: string
}

const MAX_RESULTS = 30
const CANDIDATE_POOL_LIMIT = 500
const INITIAL_MAX_DEPTH = 4
const INITIAL_CANDIDATE_LIMIT = 150

export async function searchFiles(
  projectPath: string,
  query: string,
): Promise<FileSearchResult[]> {
  const trimmed = query.trim()

  if (trimmed.length === 0) {
    const candidates = await window.electronAPI.findFiles(
      projectPath,
      '',
      INITIAL_MAX_DEPTH,
      INITIAL_CANDIDATE_LIMIT,
    )
    return rankInitialCandidates(candidates)
  }

  const candidates = await window.electronAPI.findFiles(
    projectPath,
    trimmed,
    undefined,
    CANDIDATE_POOL_LIMIT,
  )
  return rankCandidates(candidates, trimmed)
}

function rankInitialCandidates(candidates: FileSearchResult[]): FileSearchResult[] {
  return candidates
    .sort((a, b) => {
      if (a.relativePath.length !== b.relativePath.length) {
        return a.relativePath.length - b.relativePath.length
      }
      return a.relativePath.localeCompare(b.relativePath)
    })
    .slice(0, MAX_RESULTS)
}

function rankCandidates(candidates: FileSearchResult[], query: string): FileSearchResult[] {
  const queryLower = Array.from(query.toLowerCase())
  if (queryLower.length === 0) return []

  const isPathQuery = query.includes('/')

  const scored: { result: FileSearchResult; score: number }[] = []
  for (const candidate of candidates) {
    const score = fuzzyScore(
      queryLower,
      candidate.fileName,
      candidate.relativePath,
      isPathQuery,
    )
    if (score === null) continue
    scored.push({ result: candidate, score })
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    if (a.result.relativePath.length !== b.result.relativePath.length) {
      return a.result.relativePath.length - b.result.relativePath.length
    }
    return a.result.relativePath.localeCompare(b.result.relativePath)
  })

  return scored.slice(0, MAX_RESULTS).map((s) => s.result)
}

export function fuzzyScore(
  queryLower: string[],
  fileName: string,
  relativePath: string,
  preferPath: boolean,
): number | null {
  const pathLower = Array.from(relativePath.toLowerCase())

  if (preferPath) {
    const pathScore = scoreAgainst(queryLower, pathLower)
    if (pathScore === null) return null
    return pathScore.score + 1000
  }

  const fileNameLower = Array.from(fileName.toLowerCase())
  const nameScore = scoreAgainst(queryLower, fileNameLower)
  if (nameScore !== null) {
    const bonus = Math.max(0, 60 - nameScore.firstMatchIndex * 5)
    return nameScore.score + bonus + 1000
  }

  const pathScore = scoreAgainst(queryLower, pathLower)
  if (pathScore !== null) {
    return pathScore.score
  }

  return null
}

interface SubsequenceScore {
  score: number
  firstMatchIndex: number
}

function scoreAgainst(
  queryLower: string[],
  targetLower: string[],
): SubsequenceScore | null {
  if (queryLower.length === 0 || targetLower.length < queryLower.length) return null

  if (queryLower.length === targetLower.length && arraysEqual(queryLower, targetLower)) {
    return { score: 10000, firstMatchIndex: 0 }
  }

  const contiguousRange = rangeOfContiguous(queryLower, targetLower)
  if (contiguousRange !== null) {
    let score = 5000 - contiguousRange.start * 10
    if (contiguousRange.start === 0) score += 1500
    if (
      contiguousRange.start > 0 &&
      isSeparator(targetLower[contiguousRange.start - 1])
    ) {
      score += 800
    }
    return { score, firstMatchIndex: contiguousRange.start }
  }

  return subsequenceScore(queryLower, targetLower)
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function rangeOfContiguous(
  query: string[],
  target: string[],
): { start: number; end: number } | null {
  if (query.length > target.length) return null
  const lastStart = target.length - query.length
  for (let start = 0; start <= lastStart; start++) {
    let matched = true
    for (let offset = 0; offset < query.length; offset++) {
      if (target[start + offset] !== query[offset]) {
        matched = false
        break
      }
    }
    if (matched) return { start, end: start + query.length }
  }
  return null
}

function subsequenceScore(
  queryLower: string[],
  targetLower: string[],
): SubsequenceScore | null {
  let score = 0
  let queryIndex = 0
  let previousMatchIndex = -2
  let firstMatchIndex = -1

  for (let targetIndex = 0; targetIndex < targetLower.length; targetIndex++) {
    if (queryIndex >= queryLower.length) break
    if (targetLower[targetIndex] !== queryLower[queryIndex]) continue

    if (firstMatchIndex < 0) firstMatchIndex = targetIndex

    let charScore = 10
    if (targetIndex === previousMatchIndex + 1) {
      charScore += 40
    }
    if (targetIndex === 0) {
      charScore += 50
    } else {
      const previousChar = targetLower[targetIndex - 1]
      if (isSeparator(previousChar)) {
        charScore += 35
      }
    }

    score += charScore
    previousMatchIndex = targetIndex
    queryIndex++
  }

  if (queryIndex !== queryLower.length) return null

  if (firstMatchIndex >= 0) {
    score -= firstMatchIndex
  }
  return { score, firstMatchIndex: Math.max(firstMatchIndex, 0) }
}

function isSeparator(ch: string): boolean {
  return ch === '_' || ch === '-' || ch === '.' || ch === '/' || ch === ' '
}
