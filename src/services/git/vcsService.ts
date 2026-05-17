// Original: Muxy/Services/Git/GitRepositoryService.swift — all git operations
// Description: Thin IPC wrappers for all VCS git operations, returning properly typed data.
// Status: Completed

import type { GitStatusFile, DiffDisplayRow } from './diffTypes'

interface ParsedDiffResult {
  rows: DiffDisplayRow[]
  additions: number
  deletions: number
  truncated: boolean
}

export type GitErrorCode = 'no-upstream' | 'rejected' | 'auth' | 'conflict' | 'dirty-tree' | 'unknown'

export interface GitOperationResult {
  ok: boolean
  error?: { code: string; message: string }
}

export function fetchChangedFiles(repoPath: string): Promise<GitStatusFile[]> {
  return window.electronAPI.gitChangesFiles(repoPath)
}

export function fetchFileDiff(
  repoPath: string,
  filePath: string,
  isStaged: boolean,
  isUntracked: boolean,
): Promise<ParsedDiffResult> {
  return window.electronAPI.gitDiffParse(repoPath, filePath, isStaged, isUntracked) as Promise<ParsedDiffResult>
}

// ── Branch operations ──

export function fetchCurrentBranch(repoPath: string): Promise<string> {
  return window.electronAPI.gitCurrentBranch(repoPath)
}

export function fetchAllBranches(repoPath: string): Promise<{ name: string; isCurrent: boolean }[]> {
  return window.electronAPI.gitListAllBranches(repoPath)
}

export function switchBranch(repoPath: string, branch: string): Promise<void> {
  return window.electronAPI.gitSwitchBranch(repoPath, branch)
}

export function createBranch(repoPath: string, branch: string): Promise<void> {
  return window.electronAPI.gitCreateBranch(repoPath, branch)
}

export function createAndSwitchBranch(repoPath: string, branch: string): Promise<void> {
  return window.electronAPI.gitCreateAndSwitchBranch(repoPath, branch)
}

// ── Stage / unstage / discard ──

export function stageFiles(repoPath: string, paths: string[]): Promise<void> {
  return window.electronAPI.gitStageFiles(repoPath, paths)
}

export function unstageFiles(repoPath: string, paths: string[]): Promise<void> {
  return window.electronAPI.gitUnstageFiles(repoPath, paths)
}

export function discardFiles(
  repoPath: string,
  trackedPaths: string[],
  untrackedPaths: string[],
): Promise<void> {
  return window.electronAPI.gitDiscardFiles(repoPath, trackedPaths, untrackedPaths)
}

// ── Commit / push / pull ──

export function commit(repoPath: string, message: string): Promise<string> {
  return window.electronAPI.gitCommit(repoPath, message)
}

export function push(repoPath: string): Promise<GitOperationResult> {
  return window.electronAPI.gitPush(repoPath)
}

export function pushSetUpstream(repoPath: string): Promise<GitOperationResult> {
  return window.electronAPI.gitPushSetUpstream(repoPath)
}

export function pull(repoPath: string): Promise<GitOperationResult> {
  return window.electronAPI.gitPull(repoPath)
}

export function gitFetch(repoPath: string): Promise<GitOperationResult> {
  return window.electronAPI.gitFetch(repoPath)
}

export function pullRebase(repoPath: string): Promise<GitOperationResult> {
  return window.electronAPI.gitPullRebase(repoPath)
}

export function fetchAheadBehind(
  repoPath: string,
): Promise<{ ahead: number; behind: number; hasUpstream: boolean }> {
  return window.electronAPI.gitAheadBehind(repoPath)
}

// ── Commit log ──

export interface GitCommit {
  hash: string
  shortHash: string
  subject: string
  authorName: string
  authorDate: string
  refs: { name: string; kind: string }[]
  parentHashes: string[]
}

export function fetchCommitLog(repoPath: string, maxCount: number, skip: number): Promise<GitCommit[]> {
  return window.electronAPI.gitCommitLog(repoPath, maxCount, skip)
}

export function cherryPick(repoPath: string, hash: string): Promise<void> {
  return window.electronAPI.gitCherryPick(repoPath, hash)
}

export function revertCommit(repoPath: string, hash: string): Promise<void> {
  return window.electronAPI.gitRevert(repoPath, hash)
}

// ── PR operations ──

export function fetchPRInfo(repoPath: string): Promise<Record<string, unknown> | null> {
  return window.electronAPI.gitPRInfo(repoPath)
}

export function fetchPRList(
  repoPath: string,
  state: string,
  limit: number,
): Promise<unknown[]> {
  return window.electronAPI.gitPRList(repoPath, state, limit)
}

export function createPR(
  repoPath: string,
  params: { branch: string; baseBranch: string; title: string; body: string; draft: boolean },
): Promise<string> {
  return window.electronAPI.gitPRCreate(repoPath, params)
}

export function mergePR(repoPath: string, number: number, method: string): Promise<void> {
  return window.electronAPI.gitPRMerge(repoPath, number, method)
}

export function closePR(repoPath: string, number: number): Promise<void> {
  return window.electronAPI.gitPRClose(repoPath, number)
}

export function checkoutPR(repoPath: string, number: number): Promise<void> {
  return window.electronAPI.gitPRCheckout(repoPath, number)
}

export function isGhInstalled(): Promise<boolean> {
  return window.electronAPI.gitGhInstalled()
}

export function fetchRemoteBranches(repoPath: string): Promise<string[]> {
  return window.electronAPI.gitListRemoteBranches(repoPath)
}

export function fetchDefaultBranch(repoPath: string): Promise<string | null> {
  return window.electronAPI.gitDefaultBranch(repoPath)
}

export function stageAll(repoPath: string): Promise<void> {
  return window.electronAPI.gitStageAll(repoPath)
}

export function deleteBranch(repoPath: string, branch: string, force: boolean): Promise<void> {
  return window.electronAPI.gitDeleteBranch(repoPath, branch, force)
}
