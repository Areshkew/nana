// Original: Muxy/Models/VCSTabState.swift + DiffCache.swift
// Description: Zustand store for VCS/Git tab state: changed files, diff cache, branch info,
//              commit log, pull requests, and all git operations. Side effects run via IPC.
//              Scoped by repoPath — switching projects clears stale data.
// Status: Completed

import { create } from 'zustand'
import type { GitStatusFile, DiffDisplayRow } from '@/services/git/diffTypes'
import {
  fetchChangedFiles,
  fetchFileDiff,
  fetchCurrentBranch,
  fetchAllBranches,
  switchBranch,
  createBranch,
  createAndSwitchBranch,
  stageFiles,
  unstageFiles,
  discardFiles,
  commit,
  push,
  pushSetUpstream,
  pull,
  gitFetch,
  pullRebase,
  fetchAheadBehind,
  fetchCommitLog,
  cherryPick,
  revertCommit,
  fetchPRInfo,
  fetchPRList,
  createPR,
  mergePR,
  closePR,
  checkoutPR,
  isGhInstalled,
  fetchRemoteBranches,
  fetchDefaultBranch,
  stageAll,
  deleteBranch,
  type GitCommit,
} from '@/services/git/vcsService'

export type ViewMode = 'unified' | 'split'

export interface PRInfo {
  url: string
  number: number
  state: string
  isDraft: boolean
  baseRefName: string
  mergeable: string
  mergeStateStatus: string
  statusCheckRollup: { status: string; name: string; conclusion: string | null }[]
}

export interface PRListItem {
  number: number
  title: string
  author: { login: string }
  headRefName: string
  baseRefName: string
  state: string
  isDraft: boolean
  url: string
  updatedAt: string
  statusCheckRollup: { status: string; name: string; conclusion: string | null }[]
}

export type PRLaunchState =
  | { kind: 'hidden' }
  | { kind: 'ghMissing' }
  | { kind: 'canCreate' }
  | { kind: 'hasPR'; info: PRInfo }

export type PRBranchStrategy =
  | { kind: 'useCurrent' }
  | { kind: 'createNew'; name: string }

export type PRIncludeMode = 'all' | 'stagedOnly' | 'none'

export interface PRCreateRequest {
  baseBranch: string
  title: string
  body: string
  branchStrategy: PRBranchStrategy
  includeMode: PRIncludeMode
  draft: boolean
}

interface ParsedDiffEntry {
  rows: DiffDisplayRow[]
  additions: number
  deletions: number
  truncated: boolean
}

interface BranchInfo {
  name: string
  isCurrent: boolean
}

interface VCSState {
  currentRepoPath: string | null
  files: GitStatusFile[]
  isLoadingFiles: boolean
  errorMessage: string | null
  mode: ViewMode
  expandedFilePaths: Set<string>
  stagedCollapsed: boolean
  changesCollapsed: boolean
  historyCollapsed: boolean
  pullRequestsCollapsed: boolean
  changesVisible: boolean
  historyVisible: boolean
  pullRequestsVisible: boolean
  diffCache: Map<string, ParsedDiffEntry>
  loadingDiffPaths: Set<string>
  diffErrorsByPath: Map<string, string>
  diffAccessOrder: string[]

  // Branch ops
  branchName: string
  branches: BranchInfo[]
  isLoadingBranches: boolean

  // Commit / push / pull
  commitMessage: string
  isCommitting: boolean
  isPushing: boolean
  isPulling: boolean
  aheadBehind: { ahead: number; behind: number; hasUpstream: boolean }
  isLoadingAheadBehind: boolean
  showPushUpstreamConfirmation: boolean
  statusMessage: string | null
  statusIsError: boolean
  statusMessageSetAt: number | null
  lastGitError: { code: string; message: string } | null
  isFetching: boolean

  // Commit log
  commits: GitCommit[]
  isLoadingCommits: boolean
  hasMoreCommits: boolean
  commitLogSkip: number

  // PR ops
  pullRequests: PRListItem[]
  isLoadingPullRequests: boolean
  pullRequestsLastError: string | null
  pullRequestsLastFetched: Date | null
  isGhInstalled: boolean
  isCheckingGh: boolean
  isRefreshingPRInfo: boolean
  prSearchQuery: string
  prStateFilter: string
  pullRequestInfo: PRInfo | null
  hasFetchedPullRequestInfo: boolean
  isOpeningPullRequest: boolean
  isMergingPullRequest: boolean
  isClosingPullRequest: boolean
  defaultBranch: string | null
  remoteBranches: string[]
  isLoadingRemoteBranches: boolean
  checkingOutPRNumber: number | null
  showDirtyTreeConfirmation: { prNumber: number; repoPath: string } | null
  prAutoSyncMinutes: number
}

interface VCSActions {
  // Existing
  loadChangedFiles: (repoPath: string) => Promise<void>
  setMode: (mode: ViewMode) => void
  toggleFileExpanded: (filePath: string) => void
  loadDiff: (repoPath: string, filePath: string, isStaged: boolean) => Promise<void>
  toggleStagedCollapsed: () => void
  toggleChangesCollapsed: () => void
  toggleHistoryCollapsed: () => void
  togglePullRequestsCollapsed: () => void
  clearAll: () => void
  getCachedDiff: (repoPath: string, filePath: string) => ParsedDiffEntry | undefined
  isLoadingDiff: (repoPath: string, filePath: string) => boolean
  getDiffError: (repoPath: string, filePath: string) => string | undefined

  // Branch ops
  setCommitMessage: (msg: string) => void
  loadBranches: (repoPath: string) => Promise<void>
  doSwitchBranch: (repoPath: string, branch: string) => Promise<void>
  doCreateBranch: (repoPath: string, branch: string) => Promise<void>
  doCreateAndSwitchBranch: (repoPath: string, branch: string) => Promise<void>
  doDeleteBranch: (repoPath: string, branch: string) => Promise<void>

  // Stage / unstage / discard
  stageFile: (repoPath: string, filePath: string) => Promise<void>
  unstageFile: (repoPath: string, filePath: string) => Promise<void>
  discardFile: (repoPath: string, filePath: string, isUntracked: boolean) => Promise<void>
  stageAll: (repoPath: string) => Promise<void>
  unstageAll: (repoPath: string) => Promise<void>
  discardAll: (repoPath: string) => Promise<void>

  // Commit / push / pull
  doCommit: (repoPath: string) => Promise<void>
  doPush: (repoPath: string) => Promise<void>
  doPushUpstream: (repoPath: string) => Promise<void>
  doPull: (repoPath: string) => Promise<void>
  doFetch: (repoPath: string) => Promise<void>
  doPullRebase: (repoPath: string) => Promise<void>
  doSync: (repoPath: string) => Promise<void>
  clearStatusMessage: () => void

  // Commit log
  loadCommits: (repoPath: string, reset?: boolean) => Promise<void>
  doCherryPick: (repoPath: string, hash: string) => Promise<void>
  doRevert: (repoPath: string, hash: string) => Promise<void>

  // PR ops
  checkGhInstalled: (repoPath: string) => Promise<void>
  loadPRList: (repoPath: string) => Promise<void>
  doCreatePR: (repoPath: string, params: { branch: string; baseBranch: string; title: string; body: string; draft: boolean }) => Promise<string>
  doMergePR: (repoPath: string, number: number, method: string) => Promise<void>
  doClosePR: (repoPath: string, number: number) => Promise<void>
  doCheckoutPR: (repoPath: string, number: number) => Promise<void>
  confirmDirtyTreeCheckout: () => void
  cancelDirtyTreeCheckout: () => void
  setPRSearchQuery: (query: string) => void
  setPRStateFilter: (filter: string) => void
  loadPullRequestInfo: (repoPath: string) => Promise<void>
  loadRemoteBranches: (repoPath: string) => Promise<void>
  doPerformPRFlow: (repoPath: string, request: PRCreateRequest) => Promise<string>
  getFilteredPRs: () => PRListItem[]
  getPRLaunchState: () => PRLaunchState
  setPRAutoSyncMinutes: (minutes: number) => void

  // Visibility
  setChangesVisible: (visible: boolean) => void
  setHistoryVisible: (visible: boolean) => void
  setPullRequestsVisible: (visible: boolean) => void
}

type VCSStore = VCSState & VCSActions

const DIFF_CACHE_CAP = 30

function cacheKey(repoPath: string, filePath: string): string {
  return `${repoPath}::${filePath}`
}

function ensureRepoPath(repoPath: string, state: VCSState): Partial<VCSState> | null {
  if (state.currentRepoPath === repoPath) return null
  return {
    currentRepoPath: repoPath,
    files: [],
    expandedFilePaths: new Set(),
    diffCache: new Map(),
    loadingDiffPaths: new Set(),
    diffErrorsByPath: new Map(),
    diffAccessOrder: [],
    errorMessage: null,
    branchName: '',
    branches: [],
    commits: [],
    hasMoreCommits: true,
    commitLogSkip: 0,
    aheadBehind: { ahead: 0, behind: 0, hasUpstream: false },
    pullRequests: [],
    pullRequestInfo: null,
    hasFetchedPullRequestInfo: false,
    defaultBranch: null,
    remoteBranches: [],
    checkingOutPRNumber: null,
  }
}

function createVCSStore() {
  let loadVersion = 0
  return create<VCSStore>((set, get) => ({
    currentRepoPath: null,
    files: [],
    isLoadingFiles: false,
    errorMessage: null,
    mode: 'unified',
    expandedFilePaths: new Set<string>(),
    stagedCollapsed: true,
    changesCollapsed: true,
    historyCollapsed: true,
    pullRequestsCollapsed: true,
    changesVisible: true,
    historyVisible: true,
    pullRequestsVisible: true,
    diffCache: new Map(),
    loadingDiffPaths: new Set<string>(),
    diffErrorsByPath: new Map<string, string>(),
    diffAccessOrder: [],

    branchName: '',
    branches: [],
    isLoadingBranches: false,

    commitMessage: '',
    isCommitting: false,
    isPushing: false,
    isPulling: false,
    aheadBehind: { ahead: 0, behind: 0, hasUpstream: false },
    isLoadingAheadBehind: false,
    showPushUpstreamConfirmation: false,
    statusMessage: null,
    statusIsError: false,
    statusMessageSetAt: null,
    lastGitError: null,
    isFetching: false,

    commits: [],
    isLoadingCommits: false,
    hasMoreCommits: true,
    commitLogSkip: 0,

    pullRequests: [],
    isLoadingPullRequests: false,
    pullRequestsLastError: null,
    pullRequestsLastFetched: null,
    isGhInstalled: false,
    isCheckingGh: false,
    isRefreshingPRInfo: false,
    prSearchQuery: '',
    prStateFilter: 'open',
    pullRequestInfo: null,
    hasFetchedPullRequestInfo: false,
    isOpeningPullRequest: false,
    isMergingPullRequest: false,
    isClosingPullRequest: false,
    defaultBranch: null,
    remoteBranches: [],
    isLoadingRemoteBranches: false,
    checkingOutPRNumber: null,
    showDirtyTreeConfirmation: null,
    prAutoSyncMinutes: 0,

    // ── Existing ops ──

    loadChangedFiles: async (repoPath: string) => {
      const reset = ensureRepoPath(repoPath, get())
      if (reset) set(reset)

      const version = ++loadVersion
      set({ isLoadingFiles: true, errorMessage: null })
      try {
        const files = await fetchChangedFiles(repoPath)
        if (version !== loadVersion) return
        const [branchName, aheadBehind, prInfo, defBranch] = await Promise.allSettled([
          fetchCurrentBranch(repoPath),
          fetchAheadBehind(repoPath),
          fetchPRInfo(repoPath),
          fetchDefaultBranch(repoPath),
        ])
        set({
          files,
          isLoadingFiles: false,
          branchName: branchName.status === 'fulfilled' ? branchName.value : '',
          aheadBehind: aheadBehind.status === 'fulfilled' ? aheadBehind.value : { ahead: 0, behind: 0, hasUpstream: false },
          pullRequestInfo: prInfo.status === 'fulfilled' ? prInfo.value as PRInfo | null : null,
          hasFetchedPullRequestInfo: prInfo.status === 'fulfilled',
          defaultBranch: defBranch.status === 'fulfilled' ? defBranch.value : null,
        })
      } catch (err) {
        set({
          isLoadingFiles: false,
          errorMessage: err instanceof Error ? err.message : 'Failed to load git status',
        })
      }
    },

    setMode: (mode: ViewMode) => {
      set({ mode })
    },

    toggleFileExpanded: (filePath: string) => {
      const { expandedFilePaths } = get()
      const next = new Set(expandedFilePaths)
      if (next.has(filePath)) {
        next.delete(filePath)
      } else {
        next.add(filePath)
      }
      set({ expandedFilePaths: next })
    },

    loadDiff: async (repoPath: string, filePath: string, isStaged: boolean) => {
      const reset = ensureRepoPath(repoPath, get())
      if (reset) set(reset)

      const { diffCache, loadingDiffPaths, files } = get()
      const key = cacheKey(repoPath, filePath)

      if (diffCache.has(key) || loadingDiffPaths.has(key)) return

      const nextLoading = new Set(loadingDiffPaths)
      nextLoading.add(key)
      set({ loadingDiffPaths: nextLoading })

      try {
        const file = files.find((f) => f.path === filePath)
        const isUntracked = file
          ? (file.xStatus === '?' && file.yStatus === '?')
          : false

        const result = await fetchFileDiff(repoPath, filePath, isStaged, isUntracked)

        const { diffCache: currentCache } = get()
        const nextCache = new Map(currentCache)
        const entry: ParsedDiffEntry = {
          rows: result.rows,
          additions: result.additions,
          deletions: result.deletions,
          truncated: result.truncated,
        }
        nextCache.set(key, entry)

        let { diffAccessOrder } = get()
        diffAccessOrder = diffAccessOrder.filter((p) => p !== key)
        diffAccessOrder.push(key)

        const expanded = new Set(Array.from(get().expandedFilePaths))
        while (diffAccessOrder.length > DIFF_CACHE_CAP) {
          const oldest = diffAccessOrder.shift()!
          if (expanded.has(oldest)) {
            diffAccessOrder.push(oldest)
            continue
          }
          nextCache.delete(oldest)
        }

        const nextLoadingFinal = new Set(get().loadingDiffPaths)
        nextLoadingFinal.delete(key)

        set({
          diffCache: nextCache,
          loadingDiffPaths: nextLoadingFinal,
          diffAccessOrder,
        })

        const { diffAccessOrder: _accessOrder } = get()
        if (_accessOrder.length > get().diffCache.size + 15) {
          set({ diffAccessOrder: _accessOrder.slice(-get().diffCache.size + 15) })
        }
      } catch (err) {
        const nextLoadingFinal = new Set(get().loadingDiffPaths)
        nextLoadingFinal.delete(key)
        const nextErrors = new Map(get().diffErrorsByPath)
        nextErrors.set(
          key,
          err instanceof Error ? err.message : 'Failed to load diff',
        )
        set({
          loadingDiffPaths: nextLoadingFinal,
          diffErrorsByPath: nextErrors,
        })
      }
    },

    toggleStagedCollapsed: () => set((s) => ({ stagedCollapsed: !s.stagedCollapsed })),
    toggleChangesCollapsed: () => set((s) => ({ changesCollapsed: !s.changesCollapsed })),
    toggleHistoryCollapsed: () => set((s) => ({ historyCollapsed: !s.historyCollapsed })),
    togglePullRequestsCollapsed: () => set((s) => ({ pullRequestsCollapsed: !s.pullRequestsCollapsed })),

    clearAll: () => {
      set({
        currentRepoPath: null,
        files: [],
        expandedFilePaths: new Set(),
        diffCache: new Map(),
        loadingDiffPaths: new Set(),
        diffErrorsByPath: new Map(),
        diffAccessOrder: [],
        errorMessage: null,
        branchName: '',
        branches: [],
        commits: [],
        hasMoreCommits: true,
        commitLogSkip: 0,
        aheadBehind: { ahead: 0, behind: 0, hasUpstream: false },
        pullRequests: [],
        pullRequestInfo: null,
        hasFetchedPullRequestInfo: false,
        defaultBranch: null,
        remoteBranches: [],
        checkingOutPRNumber: null,
      })
    },

    getCachedDiff: (repoPath: string, filePath: string): ParsedDiffEntry | undefined => {
      return get().diffCache.get(cacheKey(repoPath, filePath))
    },

    isLoadingDiff: (repoPath: string, filePath: string): boolean => {
      return get().loadingDiffPaths.has(cacheKey(repoPath, filePath))
    },

    getDiffError: (repoPath: string, filePath: string): string | undefined => {
      return get().diffErrorsByPath.get(cacheKey(repoPath, filePath))
    },

    // ── Branch ops ──

    setCommitMessage: (msg: string) => set({ commitMessage: msg }),

    loadBranches: async (repoPath: string) => {
      set({ isLoadingBranches: true })
      try {
        const branches = await fetchAllBranches(repoPath)
        const branchName = branches.find((b) => b.isCurrent)?.name ?? get().branchName
        set({ branches, branchName, isLoadingBranches: false })
      } catch {
        set({ isLoadingBranches: false })
      }
    },

    doSwitchBranch: async (repoPath: string, branch: string) => {
      set({ statusMessage: null })
      try {
        await switchBranch(repoPath, branch)
        set({ branchName: branch, statusMessage: `Switched to ${branch}` })
        void get().loadChangedFiles(repoPath)
        void get().loadBranches(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create branch'
        set({ statusMessage: msg, statusIsError: true })
        throw err
      }
    },

    doDeleteBranch: async (repoPath: string, branch: string) => {
      set({ statusMessage: null })
      try {
        await deleteBranch(repoPath, branch, true)
        set({ statusMessage: `Deleted branch ${branch}` })
        void get().loadBranches(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete branch'
        set({ statusMessage: msg, statusIsError: true })
      }
    },

    doCreateBranch: async (repoPath: string, branch: string) => {
      set({ statusMessage: null })
      try {
        await createBranch(repoPath, branch)
        set({ statusMessage: `Created branch ${branch}` })
        void get().loadBranches(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create branch'
        set({ statusMessage: msg, statusIsError: true })
        throw err
      }
    },

    doCreateAndSwitchBranch: async (repoPath: string, branch: string) => {
      set({ statusMessage: null })
      try {
        await createAndSwitchBranch(repoPath, branch)
        set({ branchName: branch, statusMessage: `Created and switched to ${branch}` })
        void get().loadChangedFiles(repoPath)
        void get().loadBranches(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create branch'
        set({ statusMessage: msg, statusIsError: true })
        throw err
      }
    },

    // ── Stage / unstage / discard ──

    stageFile: async (repoPath: string, filePath: string) => {
      set({ statusMessage: null })
      try {
        await stageFiles(repoPath, [filePath])
        void get().loadChangedFiles(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to stage file'
        set({ statusMessage: msg, statusIsError: true })
      }
    },

    unstageFile: async (repoPath: string, filePath: string) => {
      set({ statusMessage: null })
      try {
        await unstageFiles(repoPath, [filePath])
        void get().loadChangedFiles(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to unstage file'
        set({ statusMessage: msg, statusIsError: true })
      }
    },

    discardFile: async (repoPath: string, filePath: string, isUntracked: boolean) => {
      set({ statusMessage: null })
      try {
        await discardFiles(repoPath, isUntracked ? [] : [filePath], isUntracked ? [filePath] : [])
        void get().loadChangedFiles(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to discard changes'
        set({ statusMessage: msg, statusIsError: true })
      }
    },

    stageAll: async (repoPath: string) => {
      const stagedPaths = get().files.filter((f) => f.isUnstaged)
        .map((f) => f.path)
      if (stagedPaths.length === 0) return
      try {
        await stageFiles(repoPath, stagedPaths)
        void get().loadChangedFiles(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to stage all'
        set({ statusMessage: msg, statusIsError: true })
      }
    },

    unstageAll: async (repoPath: string) => {
      const unstagePaths = get().files.filter((f) => f.isStaged)
        .map((f) => f.path)
      if (unstagePaths.length === 0) return
      try {
        await unstageFiles(repoPath, unstagePaths)
        void get().loadChangedFiles(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to unstage all'
        set({ statusMessage: msg, statusIsError: true })
      }
    },

    discardAll: async (repoPath: string) => {
      const files = get().files
      const tracked = files.filter((f) => !f.isStaged && f.yStatus !== '?')
        .map((f) => f.path)
      const untracked = files.filter((f) => f.xStatus === '?' && f.yStatus === '?')
        .map((f) => f.path)
      if (tracked.length === 0 && untracked.length === 0) return
      try {
        await discardFiles(repoPath, tracked, untracked)
        void get().loadChangedFiles(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to discard all'
        set({ statusMessage: msg, statusIsError: true })
      }
    },

    // ── Commit / push / pull ──

    doCommit: async (repoPath: string) => {
      const { commitMessage, files } = get()
      if (!commitMessage.trim()) return
      const hasStaged = files.some((f) => f.isStaged)
      if (!hasStaged) {
        set({ statusMessage: 'No staged changes to commit.', statusIsError: true, statusMessageSetAt: Date.now() })
        return
      }
      set({ isCommitting: true, statusMessage: null, statusMessageSetAt: null, lastGitError: null })
      try {
        await commit(repoPath, commitMessage)
        set({
          commitMessage: '',
          isCommitting: false,
          statusMessage: 'Committed successfully',
          statusIsError: false,
          statusMessageSetAt: Date.now(),
        })
        void get().loadChangedFiles(repoPath)
        void get().loadCommits(repoPath, true)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to commit'
        set({ isCommitting: false, statusMessage: msg, statusIsError: true, statusMessageSetAt: Date.now() })
      }
    },

    doPush: async (repoPath: string) => {
      set({ isPushing: true, statusMessage: null, statusMessageSetAt: null, lastGitError: null, showPushUpstreamConfirmation: false })
      const result = await push(repoPath)
      if (result.ok) {
        set({ isPushing: false, statusMessage: 'Pushed successfully', statusIsError: false, statusMessageSetAt: Date.now() })
        void get().loadChangedFiles(repoPath)
        return
      }
      const err = result.error!
      if (err.code === 'no-upstream') {
        set({ isPushing: false, showPushUpstreamConfirmation: true })
        return
      }
      set({
        isPushing: false,
        statusMessage: err.message,
        statusIsError: true,
        statusMessageSetAt: Date.now(),
        lastGitError: { code: err.code, message: err.message },
      })
    },

    doPushUpstream: async (repoPath: string) => {
      set({ isPushing: true, showPushUpstreamConfirmation: false, statusMessage: null, statusMessageSetAt: null, lastGitError: null })
      const result = await pushSetUpstream(repoPath)
      if (result.ok) {
        set({ isPushing: false, statusMessage: 'Pushed upstream', statusIsError: false, statusMessageSetAt: Date.now() })
        void get().loadChangedFiles(repoPath)
        return
      }
      const err = result.error!
      set({
        isPushing: false,
        statusMessage: err.message,
        statusIsError: true,
        statusMessageSetAt: Date.now(),
        lastGitError: { code: err.code, message: err.message },
      })
    },

    doPull: async (repoPath: string) => {
      set({ isPulling: true, statusMessage: null, statusMessageSetAt: null, lastGitError: null })
      const result = await pull(repoPath)
      if (result.ok) {
        set({ isPulling: false, statusMessage: 'Pulled successfully', statusIsError: false, statusMessageSetAt: Date.now() })
        void get().loadChangedFiles(repoPath)
        void get().loadCommits(repoPath, true)
        return
      }
      const err = result.error!
      set({
        isPulling: false,
        statusMessage: err.message,
        statusIsError: true,
        statusMessageSetAt: Date.now(),
        lastGitError: { code: err.code, message: err.message },
      })
    },

    doFetch: async (repoPath: string) => {
      set({ isFetching: true, statusMessage: null, statusMessageSetAt: null, lastGitError: null })
      const result = await gitFetch(repoPath)
      if (result.ok) {
        set({ isFetching: false, statusMessage: 'Fetched successfully', statusIsError: false, statusMessageSetAt: Date.now() })
        void get().loadChangedFiles(repoPath)
        return
      }
      const err = result.error!
      set({
        isFetching: false,
        statusMessage: err.message,
        statusIsError: true,
        statusMessageSetAt: Date.now(),
        lastGitError: { code: err.code, message: err.message },
      })
    },

    doPullRebase: async (repoPath: string) => {
      set({ isPulling: true, statusMessage: null, statusMessageSetAt: null, lastGitError: null })
      const result = await pullRebase(repoPath)
      if (result.ok) {
        set({ isPulling: false, statusMessage: 'Pulled (rebase) successfully', statusIsError: false, statusMessageSetAt: Date.now() })
        void get().loadChangedFiles(repoPath)
        void get().loadCommits(repoPath, true)
        return
      }
      const err = result.error!
      set({
        isPulling: false,
        statusMessage: err.message,
        statusIsError: true,
        statusMessageSetAt: Date.now(),
        lastGitError: { code: err.code, message: err.message },
      })
    },

    doSync: async (repoPath: string) => {
      set({ isPulling: true, isPushing: true, statusMessage: null, statusMessageSetAt: null, lastGitError: null })
      const pullResult = await pull(repoPath)
      if (!pullResult.ok) {
        const err = pullResult.error!
        set({
          isPulling: false,
          isPushing: false,
          statusMessage: err.message,
          statusIsError: true,
          statusMessageSetAt: Date.now(),
          lastGitError: { code: err.code, message: err.message },
        })
        return
      }
      void get().loadChangedFiles(repoPath)
      void get().loadCommits(repoPath, true)

      const pushResult = await push(repoPath)
      if (!pushResult.ok) {
        const err = pushResult.error!
        if (err.code === 'no-upstream') {
          const upstreamResult = await pushSetUpstream(repoPath)
          if (upstreamResult.ok) {
            set({ isPulling: false, isPushing: false, statusMessage: 'Synced (pull + push upstream)', statusIsError: false, statusMessageSetAt: Date.now() })
            void get().loadChangedFiles(repoPath)
            return
          }
          const uErr = upstreamResult.error!
          set({
            isPulling: false,
            isPushing: false,
            statusMessage: uErr.message,
            statusIsError: true,
            statusMessageSetAt: Date.now(),
            lastGitError: { code: uErr.code, message: uErr.message },
          })
          return
        }
        set({
          isPulling: false,
          isPushing: false,
          statusMessage: err.message,
          statusIsError: true,
          statusMessageSetAt: Date.now(),
          lastGitError: { code: err.code, message: err.message },
        })
        return
      }
      set({ isPulling: false, isPushing: false, statusMessage: 'Synced (pull + push)', statusIsError: false, statusMessageSetAt: Date.now() })
      void get().loadChangedFiles(repoPath)
    },

    clearStatusMessage: () => set({ statusMessage: null, statusIsError: false, statusMessageSetAt: null, lastGitError: null }),

    // ── Commit log ──

    loadCommits: async (repoPath: string, reset = false) => {
      const skip = reset ? 0 : get().commitLogSkip
      set({ isLoadingCommits: true })
      try {
        const newCommits = await fetchCommitLog(repoPath, 100, skip)
        if (reset) {
          set({ commits: newCommits, commitLogSkip: newCommits.length, hasMoreCommits: newCommits.length >= 100, isLoadingCommits: false })
        } else {
          set((s) => ({
            commits: [...s.commits, ...newCommits],
            commitLogSkip: s.commitLogSkip + newCommits.length,
            hasMoreCommits: newCommits.length >= 100,
            isLoadingCommits: false,
          }))
        }
      } catch {
        set({ isLoadingCommits: false })
      }
    },

    doCherryPick: async (repoPath: string, hash: string) => {
      set({ statusMessage: null })
      try {
        await cherryPick(repoPath, hash)
        set({ statusMessage: 'Cherry-picked successfully' })
        void get().loadChangedFiles(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to cherry-pick'
        set({ statusMessage: msg, statusIsError: true })
      }
    },

    doRevert: async (repoPath: string, hash: string) => {
      set({ statusMessage: null })
      try {
        await revertCommit(repoPath, hash)
        set({ statusMessage: 'Reverted successfully' })
        void get().loadChangedFiles(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to revert'
        set({ statusMessage: msg, statusIsError: true })
      }
    },

    // ── PR ops ──

    checkGhInstalled: async () => {
      set({ isCheckingGh: true })
      try {
        const installed = await isGhInstalled()
        set({ isGhInstalled: installed, isCheckingGh: false })
      } catch {
        set({ isCheckingGh: false })
      }
    },

    loadPRList: async (repoPath: string) => {
      set({ isLoadingPullRequests: true, pullRequestsLastError: null })
      try {
        const { prStateFilter } = get()
        const prs = await fetchPRList(repoPath, prStateFilter, 100) as PRListItem[]
        set({ pullRequests: prs, isLoadingPullRequests: false, pullRequestsLastFetched: new Date() })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load PRs'
        set({ isLoadingPullRequests: false, pullRequestsLastError: msg })
      }
    },

    doCreatePR: async (repoPath: string, params) => {
      set({ statusMessage: null })
      try {
        const url = await createPR(repoPath, params)
        set({ statusMessage: `PR created: ${url}` })
        void get().loadPRList(repoPath)
        void get().loadPullRequestInfo(repoPath)
        return url
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create PR'
        set({ statusMessage: msg, statusIsError: true })
        throw err
      }
    },

    doMergePR: async (repoPath: string, prNumber: number, method: string) => {
      set({ statusMessage: null, isMergingPullRequest: true })
      try {
        await mergePR(repoPath, prNumber, method)
        set({ statusMessage: 'PR merged successfully', pullRequestInfo: null, isMergingPullRequest: false })
        void get().loadPRList(repoPath)
        void get().loadChangedFiles(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to merge PR'
        set({ statusMessage: msg, statusIsError: true, isMergingPullRequest: false })
      }
    },

    doClosePR: async (repoPath: string, prNumber: number) => {
      set({ statusMessage: null, isClosingPullRequest: true })
      try {
        await closePR(repoPath, prNumber)
        set({ statusMessage: 'PR closed', pullRequestInfo: null, isClosingPullRequest: false })
        void get().loadPRList(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to close PR'
        set({ statusMessage: msg, statusIsError: true, isClosingPullRequest: false })
      }
    },

    doCheckoutPR: async (repoPath: string, prNumber: number) => {
      if (get().files.length > 0) {
        set({ showDirtyTreeConfirmation: { prNumber, repoPath } })
        return
      }
      set({ statusMessage: null, checkingOutPRNumber: prNumber, showDirtyTreeConfirmation: null })
      try {
        await checkoutPR(repoPath, prNumber)
        set({ statusMessage: `Checked out PR #${prNumber}`, checkingOutPRNumber: null })
        void get().loadChangedFiles(repoPath)
        void get().loadBranches(repoPath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to checkout PR'
        set({ statusMessage: msg, statusIsError: true, checkingOutPRNumber: null })
      }
    },

    confirmDirtyTreeCheckout: () => {
      const { showDirtyTreeConfirmation } = get()
      if (!showDirtyTreeConfirmation) return
      const { repoPath, prNumber } = showDirtyTreeConfirmation
      set({ statusMessage: null, checkingOutPRNumber: prNumber, showDirtyTreeConfirmation: null })
      void (async () => {
        try {
          await checkoutPR(repoPath, prNumber)
          set({ statusMessage: `Checked out PR #${prNumber}`, checkingOutPRNumber: null })
          void get().loadChangedFiles(repoPath)
          void get().loadBranches(repoPath)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to checkout PR'
          set({ statusMessage: msg, statusIsError: true, checkingOutPRNumber: null })
        }
      })()
    },

    cancelDirtyTreeCheckout: () => {
      set({ showDirtyTreeConfirmation: null })
    },

    setPRSearchQuery: (query: string) => set({ prSearchQuery: query }),
    setPRStateFilter: (filter: string) => {
      set({ prStateFilter: filter })
      const repoPath = get().currentRepoPath
      if (repoPath) void get().loadPRList(repoPath)
    },

    loadPullRequestInfo: async (repoPath: string) => {
      set({ isRefreshingPRInfo: true })
      try {
        const info = await fetchPRInfo(repoPath) as PRInfo | null
        set({ pullRequestInfo: info, hasFetchedPullRequestInfo: true, isRefreshingPRInfo: false })
      } catch {
        set({ hasFetchedPullRequestInfo: true, isRefreshingPRInfo: false })
      }
    },

    loadRemoteBranches: async (repoPath: string) => {
      set({ isLoadingRemoteBranches: true })
      try {
        const [branches, defBranch] = await Promise.allSettled([
          fetchRemoteBranches(repoPath),
          fetchDefaultBranch(repoPath),
        ])
        set({
          remoteBranches: branches.status === 'fulfilled' ? branches.value : [],
          defaultBranch: defBranch.status === 'fulfilled' ? defBranch.value : get().defaultBranch,
          isLoadingRemoteBranches: false,
        })
      } catch {
        set({ isLoadingRemoteBranches: false })
      }
    },

    doPerformPRFlow: async (repoPath: string, request: PRCreateRequest) => {
      set({ statusMessage: null, isOpeningPullRequest: true })
      try {
        let targetBranch: string
        if (request.branchStrategy.kind === 'useCurrent') {
          const current = get().branchName
          if (!current) throw new Error('No current branch')
          targetBranch = current
        } else {
          const name = request.branchStrategy.name.trim()
          if (!name) throw new Error('Branch name is required')
          await createAndSwitchBranch(repoPath, name)
          set({ branchName: name })
          targetBranch = name
        }

        if (request.includeMode === 'all') {
          await stageAll(repoPath)
        }

        if (request.includeMode !== 'none') {
          const files = await fetchChangedFiles(repoPath)
          const hasStaged = files.some((f) => f.isStaged)
          if (hasStaged) {
            const body = request.body.trim()
            const message = body ? `${request.title}\n\n${body}` : request.title
            await commit(repoPath, message)
          }
        }

        await pushSetUpstream(repoPath)

        const url = await createPR(repoPath, {
          branch: targetBranch,
          baseBranch: request.baseBranch,
          title: request.title,
          body: request.body,
          draft: request.draft,
        })

        void get().loadPullRequestInfo(repoPath)
        void get().loadChangedFiles(repoPath)
        void get().loadBranches(repoPath)
        void get().loadCommits(repoPath, true)
        void get().loadPRList(repoPath)

        set({ isOpeningPullRequest: false, statusMessage: `PR created: ${url}` })
        return url
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create PR'
        set({ isOpeningPullRequest: false, statusMessage: msg, statusIsError: true })
        throw err
      }
    },

    getFilteredPRs: () => {
      const { pullRequests, prSearchQuery } = get()
      if (!prSearchQuery) return pullRequests
      const q = prSearchQuery.toLowerCase()
      return pullRequests.filter((pr) =>
        pr.title.toLowerCase().includes(q) ||
        String(pr.number).includes(q) ||
        pr.headRefName.toLowerCase().includes(q)
      )
    },

    getPRLaunchState: () => {
      const { isGhInstalled, branchName, hasFetchedPullRequestInfo, pullRequestInfo, files, defaultBranch } = get()
      if (!isGhInstalled) return { kind: 'ghMissing' as const }
      if (!branchName || !hasFetchedPullRequestInfo) return { kind: 'hidden' as const }
      if (pullRequestInfo) return { kind: 'hasPR' as const, info: pullRequestInfo }
      const canCreate = branchName !== null && pullRequestInfo === null &&
        (files.length > 0 || branchName !== defaultBranch)
      if (!canCreate) return { kind: 'hidden' as const }
      return { kind: 'canCreate' as const }
    },

    setPRAutoSyncMinutes: (minutes: number) => set({ prAutoSyncMinutes: minutes }),

    // ── Visibility ──

    setChangesVisible: (visible: boolean) => set({ changesVisible: visible }),
    setHistoryVisible: (visible: boolean) => set({ historyVisible: visible }),
    setPullRequestsVisible: (visible: boolean) => set({ pullRequestsVisible: visible }),
  }))
}

export const useVCSStore = createVCSStore()
