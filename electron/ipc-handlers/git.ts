// Original: Muxy/Services/Git/GitWorktreeService.swift
// Description: Main-process IPC handlers for git worktree operations via child_process.
// Status: Completed

import { ipcMain } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { parsePorcelain } from '../../src/services/git/parsePorcelain.js'
import { parseStatusPorcelain, parseNumstat } from '../../src/services/git/statusParser.js'
import { parseDiffRows, collapseContextRows } from '../../src/services/git/diffParser.js'
import { readFile } from 'fs/promises'
import type { NumstatEntry } from '../../src/services/git/statusParser.js'

const execFileAsync = promisify(execFile)

function git(repoPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('git', ['-C', repoPath, ...args], {
    encoding: 'utf-8',
    timeout: 30000,
  })
}

type GitErrorCode = 'no-upstream' | 'rejected' | 'auth' | 'conflict' | 'dirty-tree' | 'unknown'

interface ClassifiedGitError {
  code: GitErrorCode
  message: string
}

function classifyGitError(stderr: string): ClassifiedGitError {
  if (stderr.includes('has no upstream branch') || stderr.includes('no upstream branch')) {
    return { code: 'no-upstream', message: 'The current branch has no upstream branch.' }
  }
  if (stderr.includes('non-fast-forward') || stderr.includes('[rejected]')) {
    return { code: 'rejected', message: 'Remote has new changes. Pull first to merge or rebase.' }
  }
  if (stderr.includes('could not read Username') || stderr.includes('Authentication failed') || stderr.includes('Permission denied') || stderr.includes('fatal: could not read')) {
    return { code: 'auth', message: 'Authentication failed. Check your credentials or SSH key.' }
  }
  if (stderr.includes('CONFLICT')) {
    return { code: 'conflict', message: 'Merge conflicts detected. Resolve conflicts and commit the result.' }
  }
  if (stderr.includes('would be overwritten by merge') || stderr.includes('local changes')) {
    return { code: 'dirty-tree', message: 'Local changes would be overwritten. Commit or stash them first.' }
  }
  return { code: 'unknown', message: stderr || 'Operation failed.' }
}

function gitSync(repoPath: string, args: string[]): Promise<{ success: boolean; stdout: string; stderr: string }> {
  return git(repoPath, args)
    .then(({ stdout, stderr }) => ({ success: true, stdout, stderr }))
    .catch((err: Error & { stdout?: string; stderr?: string }) => ({
      success: false,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message,
    }))
}

export function registerGitHandlers(): void {
  ipcMain.handle('git:isGitRepository', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') return false
    const result = await gitSync(repoPath, ['rev-parse', '--is-inside-work-tree'])
    return result.success && result.stdout.trim() === 'true'
  })

  ipcMain.handle('git:initRepository', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await gitSync(repoPath, ['init'])
    if (!result.success) throw new Error(result.stderr || 'Failed to initialize git repository')
  })

  ipcMain.handle('git:hasUncommittedChanges', async (_event, worktreePath: string) => {
    if (typeof worktreePath !== 'string') return false
    const result = await gitSync(worktreePath, ['status', '--porcelain=1', '--untracked-files=all'])
    if (!result.success) return false
    return result.stdout.trim().length > 0
  })

  ipcMain.handle('git:listWorktrees', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await gitSync(repoPath, ['worktree', 'list', '--porcelain'])
    if (!result.success) {
      throw new Error(result.stderr || 'Failed to list worktrees')
    }
    return parsePorcelain(result.stdout)
  })

  ipcMain.handle('git:listBranches', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await gitSync(repoPath, ['branch', '--list', '--format=%(refname:short)'])
    if (!result.success) {
      throw new Error(result.stderr || 'Failed to list branches')
    }
    return result.stdout
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
  })

  ipcMain.handle(
    'git:addWorktree',
    async (_event, repoPath: string, wtPath: string, branch: string, createBranch: boolean) => {
      if (typeof repoPath !== 'string' || typeof wtPath !== 'string' || typeof branch !== 'string') {
        throw new Error('Invalid addWorktree params')
      }
      if (typeof createBranch !== 'boolean') throw new Error('Invalid createBranch param')

      const allowedRe = /^[a-zA-Z0-9._/-]+$/
      if (!branch || branch.startsWith('-') || !allowedRe.test(branch)) {
        throw new Error('Invalid branch name')
      }

      const args = createBranch
        ? ['worktree', 'add', '-b', branch, '--', wtPath]
        : ['worktree', 'add', '--', wtPath, branch]

      const result = await gitSync(repoPath, args)
      if (!result.success) {
        throw new Error(result.stderr || 'Failed to add worktree')
      }
    },
  )

  ipcMain.handle(
    'git:removeWorktree',
    async (_event, repoPath: string, wtPath: string, force: boolean) => {
      if (typeof repoPath !== 'string' || typeof wtPath !== 'string') {
        throw new Error('Invalid removeWorktree params')
      }
      const args = ['worktree', 'remove']
      if (force) args.push('--force')
      args.push('--', wtPath)

      const result = await gitSync(repoPath, args)
      if (!result.success) {
        throw new Error(result.stderr || 'Failed to remove worktree')
      }
    },
  )

  ipcMain.handle(
    'git:deleteBranch',
    async (_event, repoPath: string, branch: string, force: boolean) => {
      if (typeof repoPath !== 'string' || typeof branch !== 'string') {
        throw new Error('Invalid deleteBranch params')
      }
      const args = ['branch', force ? '-D' : '-d', '--', branch]
      const result = await gitSync(repoPath, args)
      if (!result.success) {
        throw new Error(result.stderr || `Failed to delete branch ${branch}`)
      }
    },
  )

  ipcMain.handle(
    'git:changes-files',
    async (_event, repoPath: string) => {
      if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')

      const verifyResult = await gitSync(repoPath, ['rev-parse', '--is-inside-work-tree'])
      if (!verifyResult.success || verifyResult.stdout.trim() !== 'true') {
        throw new Error('Not a git repository')
      }

      const [statusResult, numstatResult] = await Promise.all([
        git(repoPath, [
          '-c', 'core.quotepath=false',
          'status', '--porcelain=v1', '-z', '--untracked-files=all',
        ]).catch(() => null),
        git(repoPath, [
          '-c', 'core.quotepath=false',
          'diff', 'HEAD', '--numstat', '--no-color', '--no-ext-diff',
        ]).catch(() => null),
      ])

      if (!statusResult) {
        throw new Error('Failed to load git status')
      }

      const statusBuffer = Buffer.from(statusResult.stdout, 'utf-8')
      const stats: Map<string, NumstatEntry> = numstatResult
        ? parseNumstat(numstatResult.stdout)
        : new Map<string, NumstatEntry>()

      const files = parseStatusPorcelain(statusBuffer, stats)

      await Promise.all(
        files.map(async (file) => {
          if (file.additions !== null) return
          if (file.xStatus !== '?' && file.xStatus !== 'A') return
          try {
            const content = await readFile(repoPath + '/' + file.path, 'utf-8')
            file.additions = content ? content.split('\n').length : 0
          } catch {
            // File may have been deleted between status and read
          }
        }),
      )

      return files
    },
  )

  ipcMain.handle(
    'git:diff-parse',
    async (_event, repoPath: string, filePath: string, isStaged: boolean, isUntracked: boolean) => {
      if (typeof repoPath !== 'string' || typeof filePath !== 'string') {
        throw new Error('Invalid diff-parse params')
      }

      // Untracked/new file: read from disk
      if (isUntracked) {
        try {
          const content = await readFile(repoPath + '/' + filePath, 'utf-8')
          const lines = content.split('\n')
          const rows = parseDiffRows(
            `diff --git a/${filePath} b/${filePath}\n--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((l) => '+' + l).join('\n')}`,
          )
          return {
            rows: collapseContextRows(rows.rows),
            additions: rows.additions,
            deletions: 0,
            truncated: false,
          }
        } catch {
          return { rows: [], additions: 0, deletions: 0, truncated: false }
        }
      }

      // Staged or unstaged diff
      const args = [
        '-c', 'core.quotepath=false',
        'diff',
        isStaged ? '--cached' : '',
        '--no-color', '--no-ext-diff',
        '--', filePath,
      ].filter(Boolean)

      let result: { stdout: string } | null
      try {
        result = await git(repoPath, args)
      } catch {
        throw new Error(`Failed to load diff for ${filePath}`)
      }

      const parsed = parseDiffRows(result.stdout)
      return {
        rows: collapseContextRows(parsed.rows),
        additions: parsed.additions,
        deletions: parsed.deletions,
        truncated: false,
      }
    },
  )

  // ── Branch operations ──

  ipcMain.handle('git:current-branch', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await git(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
    return result.stdout.trim()
  })

  ipcMain.handle('git:listAllBranches', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await gitSync(repoPath, ['branch', '--list', '--format=%(refname:short)'])
    if (!result.success) throw new Error(result.stderr || 'Failed to list branches')
    const branches = result.stdout.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    // Get current branch to mark it
    const currentResult = await gitSync(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
    const current = currentResult.success ? currentResult.stdout.trim() : ''
    return branches.map((name) => ({ name, isCurrent: name === current }))
  })

  ipcMain.handle('git:switch-branch', async (_event, repoPath: string, branch: string) => {
    if (typeof repoPath !== 'string' || typeof branch !== 'string') {
      throw new Error('Invalid params')
    }
    const result = await gitSync(repoPath, ['switch', '--', branch])
    if (!result.success) throw new Error(result.stderr || `Failed to switch to ${branch}`)
  })

  ipcMain.handle('git:create-branch', async (_event, repoPath: string, branch: string) => {
    if (typeof repoPath !== 'string' || typeof branch !== 'string') {
      throw new Error('Invalid params')
    }
    if (!branch || branch.startsWith('-') || !/^[a-zA-Z0-9._/-]+$/.test(branch)) {
      throw new Error('Invalid branch name')
    }
    const result = await gitSync(repoPath, ['branch', '--', branch])
    if (!result.success) throw new Error(result.stderr || `Failed to create branch ${branch}`)
  })

  ipcMain.handle('git:create-and-switch-branch', async (_event, repoPath: string, branch: string) => {
    if (typeof repoPath !== 'string' || typeof branch !== 'string') {
      throw new Error('Invalid params')
    }
    if (!branch || branch.startsWith('-') || !/^[a-zA-Z0-9._/-]+$/.test(branch)) {
      throw new Error('Invalid branch name')
    }
    const result = await gitSync(repoPath, ['switch', '-c', branch])
    if (!result.success) throw new Error(result.stderr || `Failed to create and switch to branch ${branch}`)
  })

  // ── Stage / unstage / discard ──

  ipcMain.handle('git:stage-files', async (_event, repoPath: string, paths: string[]) => {
    if (typeof repoPath !== 'string' || !Array.isArray(paths)) throw new Error('Invalid params')
    if (paths.length === 0) return
    const result = await gitSync(repoPath, ['add', '--', ...paths])
    if (!result.success) throw new Error(result.stderr || 'Failed to stage files')
  })

  ipcMain.handle('git:unstage-files', async (_event, repoPath: string, paths: string[]) => {
    if (typeof repoPath !== 'string' || !Array.isArray(paths)) throw new Error('Invalid params')
    if (paths.length === 0) return
    const result = await gitSync(repoPath, ['reset', 'HEAD', '--', ...paths])
    if (!result.success) throw new Error(result.stderr || 'Failed to unstage files')
  })

  ipcMain.handle('git:discard-files', async (_event, repoPath: string, trackedPaths: string[], untrackedPaths: string[]) => {
    if (typeof repoPath !== 'string' || !Array.isArray(trackedPaths) || !Array.isArray(untrackedPaths)) {
      throw new Error('Invalid params')
    }
    if (trackedPaths.length > 0) {
      const result = await gitSync(repoPath, ['checkout', '--', ...trackedPaths])
      if (!result.success) throw new Error(result.stderr || 'Failed to discard changes')
    }
    for (const relativePath of untrackedPaths) {
      try {
        const { rm } = await import('fs/promises')
        await rm(repoPath + '/' + relativePath, { force: true })
      } catch { /* file may not exist */ }
    }
  })

  // ── Commit / push / pull ──

  ipcMain.handle('git:commit', async (_event, repoPath: string, message: string) => {
    if (typeof repoPath !== 'string' || typeof message !== 'string' || !message.trim()) {
      throw new Error('Invalid commit params')
    }
    const result = await gitSync(repoPath, ['commit', '-m', message])
    if (!result.success) throw new Error(result.stderr || 'Failed to commit')
    return result.stdout.trim()
  })

  ipcMain.handle('git:push', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const branchResult = await gitSync(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
    if (!branchResult.success) throw new Error('Failed to determine current branch')
    const branch = branchResult.stdout.trim()
    const pushResult = await gitSync(repoPath, ['push', 'origin', branch])
    if (!pushResult.success) return { ok: false as const, error: classifyGitError(pushResult.stderr) }
    return { ok: true as const }
  })

  ipcMain.handle('git:push-set-upstream', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const branchResult = await gitSync(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
    if (!branchResult.success) throw new Error('Failed to determine current branch')
    const branch = branchResult.stdout.trim()
    const pushResult = await gitSync(repoPath, ['push', '--set-upstream', 'origin', branch])
    if (!pushResult.success) return { ok: false as const, error: classifyGitError(pushResult.stderr) }
    return { ok: true as const }
  })

  ipcMain.handle('git:pull', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await gitSync(repoPath, ['pull'])
    if (!result.success) return { ok: false as const, error: classifyGitError(result.stderr) }
    return { ok: true as const }
  })

  ipcMain.handle('git:fetch', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await gitSync(repoPath, ['fetch'])
    if (!result.success) return { ok: false as const, error: classifyGitError(result.stderr) }
    return { ok: true as const }
  })

  ipcMain.handle('git:pull-rebase', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await gitSync(repoPath, ['pull', '--rebase'])
    if (!result.success) return { ok: false as const, error: classifyGitError(result.stderr) }
    return { ok: true as const }
  })

  // ── Ahead/behind ──

  ipcMain.handle('git:ahead-behind', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const branchResult = await gitSync(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
    if (!branchResult.success) return { ahead: 0, behind: 0, hasUpstream: false }
    const branch = branchResult.stdout.trim()

    const upstreamResult = await gitSync(repoPath, ['rev-parse', '--abbrev-ref', `${branch}@{upstream}`])
    if (!upstreamResult.success) return { ahead: 0, behind: 0, hasUpstream: false }

    const countsResult = await gitSync(repoPath, ['rev-list', '--left-right', '--count', `${branch}...${branch}@{upstream}`])
    if (!countsResult.success) return { ahead: 0, behind: 0, hasUpstream: true }

    const parts = countsResult.stdout.trim().split('\t')
    const ahead = parseInt(parts[0] ?? '0', 10) || 0
    const behind = parseInt(parts[1] ?? '0', 10) || 0
    return { ahead, behind, hasUpstream: true }
  })

  // ── Commit log ──

  ipcMain.handle('git:commit-log', async (_event, repoPath: string, maxCount: number, skip: number) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const fieldSep = '\x1F'
    const recordSep = '\x1E'
    const format = ['%H', '%h', '%s', '%an', '%aI', '%D', '%P'].join(fieldSep) + recordSep

    const args = ['log', `--format=${format}`, `--max-count=${maxCount || 100}`]
    if (skip && skip > 0) args.push(`--skip=${skip}`)

    const result = await gitSync(repoPath, args)
    if (!result.success) throw new Error(result.stderr || 'Failed to load commit log')

    const records = result.stdout.split(recordSep).filter((r) => r.trim())
    return records.map((record) => {
      const fields = record.trim().split(fieldSep)
      if (fields.length < 7) return null
      return {
        hash: fields[0] || '',
        shortHash: fields[1] || '',
        subject: fields[2] || '',
        authorName: fields[3] || '',
        authorDate: fields[4] || '',
        refs: parseRefs(fields[5] || ''),
        parentHashes: (fields[6] || '').split(' ').filter(Boolean),
      }
    }).filter(Boolean)
  })

  // ── Cherry-pick / revert ──

  ipcMain.handle('git:cherry-pick', async (_event, repoPath: string, hash: string) => {
    if (typeof repoPath !== 'string' || typeof hash !== 'string') throw new Error('Invalid params')
    const result = await gitSync(repoPath, ['cherry-pick', hash])
    if (!result.success) throw new Error(result.stderr || 'Failed to cherry-pick')
  })

  ipcMain.handle('git:revert', async (_event, repoPath: string, hash: string) => {
    if (typeof repoPath !== 'string' || typeof hash !== 'string') throw new Error('Invalid params')
    const result = await gitSync(repoPath, ['revert', '--no-edit', hash])
    if (!result.success) throw new Error(result.stderr || 'Failed to revert')
  })

  // ── PR operations (gh CLI) ──

  ipcMain.handle('git:pr-info', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await gitSync(repoPath, [
      'pr', 'view', '--json',
      'url,number,state,isDraft,baseRefName,mergeable,mergeStateStatus,statusCheckRollup',
    ])
    if (!result.success) return null
    try {
      return JSON.parse(result.stdout) as Record<string, unknown>
    } catch {
      return null
    }
  })

  ipcMain.handle('git:pr-list', async (_event, repoPath: string, state: string, limit: number) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await gitSync(repoPath, [
      'pr', 'list', '--state', state || 'open', '--limit', String(limit || 100),
      '--json', 'number,title,author,headRefName,baseRefName,state,isDraft,url,updatedAt,statusCheckRollup',
    ])
    if (!result.success) throw new Error(result.stderr || 'Failed to list PRs')
    try {
      return JSON.parse(result.stdout) as unknown[]
    } catch {
      throw new Error('Failed to parse PR list')
    }
  })

  ipcMain.handle('git:pr-create', async (_event, repoPath: string, params: {
    branch: string
    baseBranch: string
    title: string
    body: string
    draft: boolean
  }) => {
    if (typeof repoPath !== 'string' || typeof params !== 'object') throw new Error('Invalid params')
    const args = [
      'pr', 'create', '--head', params.branch, '--base', params.baseBranch,
      '--title', params.title, '--body', params.body,
    ]
    if (params.draft) args.push('--draft')
    const result = await gitSync(repoPath, args)
    if (!result.success) throw new Error(result.stderr || 'Failed to create PR')
    return result.stdout.trim()
  })

  ipcMain.handle('git:pr-merge', async (_event, repoPath: string, number: number, method: string) => {
    if (typeof repoPath !== 'string' || typeof number !== 'number') throw new Error('Invalid params')
    const flag = method === 'squash' ? '--squash' : method === 'rebase' ? '--rebase' : '--merge'
    const result = await gitSync(repoPath, [
      'pr', 'merge', String(number), flag, '--delete-branch',
    ])
    if (!result.success) throw new Error(result.stderr || 'Failed to merge PR')
  })

  ipcMain.handle('git:pr-close', async (_event, repoPath: string, number: number) => {
    if (typeof repoPath !== 'string' || typeof number !== 'number') throw new Error('Invalid params')
    const result = await gitSync(repoPath, ['pr', 'close', String(number)])
    if (!result.success) throw new Error(result.stderr || 'Failed to close PR')
  })

  ipcMain.handle('git:pr-checkout', async (_event, repoPath: string, number: number) => {
    if (typeof repoPath !== 'string' || typeof number !== 'number') throw new Error('Invalid params')
    const result = await gitSync(repoPath, ['pr', 'checkout', String(number)])
    if (!result.success) throw new Error(result.stderr || 'Failed to checkout PR')
  })

  // ── Remote branches / default branch ──

  ipcMain.handle('git:list-remote-branches', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await gitSync(repoPath, ['ls-remote', '--heads', 'origin'])
    if (!result.success) throw new Error(result.stderr || 'Failed to list remote branches')
    return result.stdout.split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => {
        const parts = l.split('\t')
        return parts[1]?.replace('refs/heads/', '') ?? ''
      })
      .filter(Boolean)
  })

  ipcMain.handle('git:default-branch', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await gitSync(repoPath, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
    if (!result.success) return null
    return result.stdout.trim().replace('origin/', '')
  })

  ipcMain.handle('git:stage-all', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') throw new Error('Invalid repoPath')
    const result = await gitSync(repoPath, ['add', '--all'])
    if (!result.success) throw new Error(result.stderr || 'Failed to stage all')
  })

  // ── gh installed check ──

  ipcMain.handle('git:gh-installed', async () => {
    const whichPaths = process.platform === 'win32'
      ? ['where', 'gh']
      : ['which', 'gh']
    try {
      const { execFile: ef } = await import('child_process')
      const prom = await import('util')
      const execFileAsync = prom.promisify(ef)
      await execFileAsync(whichPaths[0], ['gh'], { timeout: 5000 })
      return true
    } catch {
      return false
    }
  })
}

function parseRefs(raw: string): { name: string; kind: string }[] {
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean).map((segment) => {
    if (segment === 'HEAD') return { name: 'HEAD', kind: 'head' }
    if (segment.startsWith('HEAD -> ')) {
      const branch = segment.slice('HEAD -> '.length).replace('refs/heads/', '')
      return { name: branch, kind: 'localBranch' }
    }
    if (segment.startsWith('tag: ')) {
      const tag = segment.slice('tag: '.length).replace('refs/tags/', '')
      return { name: tag, kind: 'tag' }
    }
    if (segment.startsWith('refs/heads/')) {
      return { name: segment.slice('refs/heads/'.length), kind: 'localBranch' }
    }
    if (segment.startsWith('refs/remotes/')) {
      return { name: segment.slice('refs/remotes/'.length), kind: 'remoteBranch' }
    }
    if (segment.startsWith('refs/tags/')) {
      return { name: segment.slice('refs/tags/'.length), kind: 'tag' }
    }
    return { name: segment, kind: 'localBranch' }
  })
}
