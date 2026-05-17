// Original: Muxy/Services/Git/GitWorktreeService.swift
// Description: Renderer-side git worktree service wrapping IPC bridge to main process.
// Status: Completed

export interface GitWorktreeRecord {
  path: string
  branch: string | null
  head: string | null
  isBare: boolean
  isDetached: boolean
  isPrunable: boolean
}

export async function isGitRepository(repoPath: string): Promise<boolean> {
  return window.electronAPI.gitIsGitRepository(repoPath)
}

export async function hasGitDir(dirPath: string): Promise<boolean> {
  return window.electronAPI.fsHasGitDir(dirPath)
}

export async function initRepository(repoPath: string): Promise<void> {
  return window.electronAPI.gitInitRepository(repoPath)
}

export async function findNestedRepos(dirPath: string): Promise<string[]> {
  return window.electronAPI.fsFindNestedRepos(dirPath)
}

export async function hasUncommittedChanges(worktreePath: string): Promise<boolean> {
  return window.electronAPI.gitHasUncommittedChanges(worktreePath)
}

export async function listWorktrees(repoPath: string): Promise<GitWorktreeRecord[]> {
  const raw = await window.electronAPI.gitListWorktrees(repoPath)
  return raw as GitWorktreeRecord[]
}

export async function listBranches(repoPath: string): Promise<string[]> {
  return window.electronAPI.gitListBranches(repoPath)
}

export async function addWorktree(
  repoPath: string,
  wtPath: string,
  branch: string,
  createBranch: boolean,
): Promise<void> {
  await window.electronAPI.gitAddWorktree(repoPath, wtPath, branch, createBranch)
}

export async function removeWorktree(
  repoPath: string,
  wtPath: string,
  force: boolean,
): Promise<void> {
  await window.electronAPI.gitRemoveWorktree(repoPath, wtPath, force)
}

export async function deleteBranch(
  repoPath: string,
  branch: string,
  force: boolean,
): Promise<void> {
  await window.electronAPI.gitDeleteBranch(repoPath, branch, force)
}
