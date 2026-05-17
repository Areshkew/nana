// Original: N/A — type bridge
// Description: Renderer-side type declaration for the Electron preload API.
// Status: ✅ Completed

export interface ElectronAPI {
  platform: () => Promise<string>
  getWorktreePath: (projectID: string, slug: string) => Promise<string>
  // PTY
  ptyCreate: (paneId: string, cols: number, rows: number, cwd?: string) => Promise<number>
  ptyWrite: (paneId: string, data: string) => Promise<void>
  ptyResize: (paneId: string, cols: number, rows: number) => Promise<void>
  ptyKill: (paneId: string) => Promise<void>
  ptyIsProcessRunning: (paneId: string) => Promise<boolean>
  ptyOnData: (callback: (paneId: string, data: string) => void) => () => void
  ptyOnExit: (callback: (paneId: string) => void) => () => void
  // Persistence
  loadProjects: () => Promise<unknown[]>
  saveProjects: (projects: unknown[]) => Promise<void>
  loadWorktrees: (projectID: string) => Promise<unknown[]>
  saveWorktrees: (projectID: string, worktrees: unknown[]) => Promise<void>
  removeWorktrees: (projectID: string) => Promise<void>
  loadWorkspaces: () => Promise<unknown[]>
  saveWorkspaces: (workspaces: unknown[]) => Promise<void>
  loadSelection: () => Promise<unknown>
  saveSelection: (selection: Record<string, unknown>) => Promise<void>
  loadSettings: () => Promise<unknown>
  saveSettings: (settings: Record<string, unknown>) => Promise<void>
  // Dialog
  openDirectory: () => Promise<string | null>
  // Window
  setTitle: (title: string) => Promise<void>
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  onMaximizedChange: (callback: (maximized: boolean) => void) => () => void
  // Git
  gitIsGitRepository: (repoPath: string) => Promise<boolean>
  gitInitRepository: (repoPath: string) => Promise<void>
  gitHasUncommittedChanges: (worktreePath: string) => Promise<boolean>
  gitListWorktrees: (repoPath: string) => Promise<unknown[]>
  gitListBranches: (repoPath: string) => Promise<string[]>
  gitAddWorktree: (repoPath: string, wtPath: string, branch: string, createBranch: boolean) => Promise<void>
  gitRemoveWorktree: (repoPath: string, wtPath: string, force: boolean) => Promise<void>
  gitDeleteBranch: (repoPath: string, branch: string, force: boolean) => Promise<void>
  gitChangesFiles: (repoPath: string) => Promise<{ path: string; oldPath: string | null; xStatus: string; yStatus: string; additions: number | null; deletions: number | null; isBinary: boolean; isStaged: boolean; isUnstaged: boolean }[]>
  gitDiffParse: (repoPath: string, filePath: string, isStaged: boolean, isUntracked: boolean) => Promise<{ rows: { kind: string; oldLineNumber: number | null; newLineNumber: number | null; oldText: string | null; newText: string | null; text: string }[]; additions: number; deletions: number; truncated: boolean }>
  // Branch ops
  gitCurrentBranch: (repoPath: string) => Promise<string>
  gitListAllBranches: (repoPath: string) => Promise<{ name: string; isCurrent: boolean }[]>
  gitSwitchBranch: (repoPath: string, branch: string) => Promise<void>
  gitCreateBranch: (repoPath: string, branch: string) => Promise<void>
  gitCreateAndSwitchBranch: (repoPath: string, branch: string) => Promise<void>
  // Stage / unstage / discard
  gitStageFiles: (repoPath: string, paths: string[]) => Promise<void>
  gitUnstageFiles: (repoPath: string, paths: string[]) => Promise<void>
  gitDiscardFiles: (repoPath: string, trackedPaths: string[], untrackedPaths: string[]) => Promise<void>
  // Commit / push / pull
  gitCommit: (repoPath: string, message: string) => Promise<string>
  gitPush: (repoPath: string) => Promise<{ ok: boolean; error?: { code: string; message: string } }>
  gitPushSetUpstream: (repoPath: string) => Promise<{ ok: boolean; error?: { code: string; message: string } }>
  gitPull: (repoPath: string) => Promise<{ ok: boolean; error?: { code: string; message: string } }>
  gitFetch: (repoPath: string) => Promise<{ ok: boolean; error?: { code: string; message: string } }>
  gitPullRebase: (repoPath: string) => Promise<{ ok: boolean; error?: { code: string; message: string } }>
  gitAheadBehind: (repoPath: string) => Promise<{ ahead: number; behind: number; hasUpstream: boolean }>
  // Commit log
  gitCommitLog: (repoPath: string, maxCount: number, skip: number) => Promise<{ hash: string; shortHash: string; subject: string; authorName: string; authorDate: string; refs: { name: string; kind: string }[]; parentHashes: string[] }[]>
  gitCherryPick: (repoPath: string, hash: string) => Promise<void>
  gitRevert: (repoPath: string, hash: string) => Promise<void>
  // PR operations
  gitPRInfo: (repoPath: string) => Promise<Record<string, unknown> | null>
  gitPRList: (repoPath: string, state: string, limit: number) => Promise<{ number: number; title: string; author: { login: string }; headRefName: string; baseRefName: string; state: string; isDraft: boolean; url: string; updatedAt: string; statusCheckRollup: unknown }[]>
  gitPRCreate: (repoPath: string, params: { branch: string; baseBranch: string; title: string; body: string; draft: boolean }) => Promise<string>
  gitPRMerge: (repoPath: string, number: number, method: string) => Promise<void>
  gitPRClose: (repoPath: string, number: number) => Promise<void>
  gitPRCheckout: (repoPath: string, number: number) => Promise<void>
  gitGhInstalled: () => Promise<boolean>
  gitListRemoteBranches: (repoPath: string) => Promise<string[]>
  gitDefaultBranch: (repoPath: string) => Promise<string | null>
  gitStageAll: (repoPath: string) => Promise<void>
  gitWatchStart: (repoPath: string) => Promise<void>
  gitWatchStop: (repoPath: string) => Promise<void>
  onGitDirectoryChanged: (callback: (repoPath: string) => void) => () => void
  // FS
  fsRemovePath: (targetPath: string) => Promise<void>
  listDir: (dirPath: string) => Promise<string[]>
  fsHasGitDir: (dirPath: string) => Promise<boolean>
  fsFindNestedRepos: (dirPath: string) => Promise<string[]>
  readTextFile: (filePath: string) => Promise<string>
  getGhosttyThemesDir: () => Promise<string | null>
  setWindowOpacity: (alpha: number) => Promise<void>
  openVCSWindow: (repoPath: string) => Promise<void>
  // Clipboard
  clipboardWriteText: (text: string) => Promise<void>
  clipboardReadText: () => Promise<string>
  // Files
  findFiles: (projectPath: string, query: string, maxDepth?: number, maxResults?: number) => Promise<{ absolutePath: string; relativePath: string; fileName: string }[]>
  // File Tree
  fileTreeReadDirectory: (directoryPath: string, repoRoot: string) => Promise<{ name: string; absolutePath: string; relativePath: string; isDirectory: boolean; isIgnored: boolean }[]>
  fileTreeGitStatusPaths: (repoRoot: string) => Promise<Record<string, string>>
  fileTreeCreateFile: (name: string, directory: string) => Promise<string>
  fileTreeCreateFolder: (name: string, directory: string) => Promise<string>
  fileTreeRename: (absolutePath: string, newName: string) => Promise<string>
  fileTreeTrash: (absolutePaths: string[]) => Promise<void>
  fileTreeMove: (sources: string[], destination: string) => Promise<string[]>
  fileTreeCopy: (sources: string[], destination: string) => Promise<string[]>
  fileTreeRevealInFinder: (filePath: string) => Promise<void>
  fileTreeStat: (filePath: string) => Promise<{ exists: boolean; isDirectory: boolean; size: number }>
  // Editor File I/O
  editorFileRead: (filePath: string) => Promise<string>
  editorFileWrite: (filePath: string, content: string) => Promise<void>
  editorFileStat: (filePath: string) => Promise<{ size: number; mtimeMs: number; isDirectory: boolean; isReadOnly: boolean }>
  // Logo
  openImageFile: () => Promise<string | null>
  saveLogo: (imagePath: string, projectID: string) => Promise<string>
  readLogo: (filename: string) => Promise<string | null>
  removeLogo: (projectID: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
