// Original: Muxy/Services/Git/GitWorktreeService.swift (parsePorcelain)
// Description: Pure parser for `git worktree list --porcelain` output.
// Status: Completed

export interface GitWorktreeRecord {
  path: string
  branch: string | null
  head: string | null
  isBare: boolean
  isDetached: boolean
  isPrunable: boolean
}

export function parsePorcelain(raw: string): GitWorktreeRecord[] {
  const records: GitWorktreeRecord[] = []
  let currentPath: string | null = null
  let currentBranch: string | null = null
  let currentHead: string | null = null
  let isBare = false
  let isDetached = false
  let isPrunable = false

  function flush(): void {
    if (currentPath !== null) {
      records.push({
        path: currentPath,
        branch: currentBranch,
        head: currentHead,
        isBare,
        isDetached,
        isPrunable,
      })
    }
    currentPath = null
    currentBranch = null
    currentHead = null
    isBare = false
    isDetached = false
    isPrunable = false
  }

  for (const line of raw.split('\n')) {
    if (line === '') {
      flush()
      continue
    }
    if (line.startsWith('worktree ')) {
      currentPath = line.substring('worktree '.length)
    } else if (line.startsWith('HEAD ')) {
      currentHead = line.substring('HEAD '.length)
    } else if (line.startsWith('branch ')) {
      const full = line.substring('branch '.length)
      currentBranch = full.startsWith('refs/heads/')
        ? full.substring('refs/heads/'.length)
        : full
    } else if (line === 'bare') {
      isBare = true
    } else if (line === 'detached') {
      isDetached = true
    } else if (line === 'prunable' || line.startsWith('prunable ')) {
      isPrunable = true
    }
  }
  flush()
  return records
}
