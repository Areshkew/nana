// Original: N/A — Electron security bridge
// Description: Exposes a minimal, whitelisted IPC API to the renderer process.
// Status: ✅ Completed

import { contextBridge, ipcRenderer } from 'electron'

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
  gitHasUncommittedChanges: (worktreePath: string) => Promise<boolean>
  gitListWorktrees: (repoPath: string) => Promise<unknown[]>
  gitListBranches: (repoPath: string) => Promise<string[]>
  gitAddWorktree: (repoPath: string, wtPath: string, branch: string, createBranch: boolean) => Promise<void>
  gitRemoveWorktree: (repoPath: string, wtPath: string, force: boolean) => Promise<void>
  gitDeleteBranch: (repoPath: string, branch: string, force: boolean) => Promise<void>
  gitChangesFiles: (repoPath: string) => Promise<unknown[]>
  gitDiffParse: (repoPath: string, filePath: string, isStaged: boolean, isUntracked: boolean) => Promise<{ rows: unknown[]; additions: number; deletions: number; truncated: boolean }>
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
  gitCommitLog: (repoPath: string, maxCount: number, skip: number) => Promise<unknown[]>
  gitCherryPick: (repoPath: string, hash: string) => Promise<void>
  gitRevert: (repoPath: string, hash: string) => Promise<void>
  // PR operations
  gitPRInfo: (repoPath: string) => Promise<unknown>
  gitPRList: (repoPath: string, state: string, limit: number) => Promise<unknown[]>
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
  readTextFile: (filePath: string) => Promise<string>
  getGhosttyThemesDir: () => Promise<string | null>
  setWindowOpacity: (alpha: number) => Promise<void>
  openVCSWindow: (repoPath: string) => Promise<void>
  // Clipboard
  clipboardWriteText: (text: string) => void
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

const api: ElectronAPI = {
  platform: () => ipcRenderer.invoke('app:platform'),
  getWorktreePath: (projectID: string, slug: string) =>
    ipcRenderer.invoke('app:getWorktreePath', projectID, slug),
  // PTY
  ptyCreate: (paneId: string, cols: number, rows: number, cwd?: string) =>
    ipcRenderer.invoke('pty:create', paneId, cols, rows, cwd),
  ptyWrite: (paneId: string, data: string) =>
    ipcRenderer.invoke('pty:write', paneId, data),
  ptyResize: (paneId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('pty:resize', paneId, cols, rows),
  ptyKill: (paneId: string) => ipcRenderer.invoke('pty:kill', paneId),
  ptyIsProcessRunning: (paneId: string) =>
    ipcRenderer.invoke('pty:isProcessRunning', paneId),
  ptyOnData: (() => {
    const subscribers = new Map<number, (paneId: string, data: string) => void>()
    let ipcHandler: ((_event: Electron.IpcRendererEvent, paneId: string, data: string) => void) | null = null

    function cleanupIpcListener(): void {
      if (subscribers.size > 0 || !ipcHandler) return
      ipcRenderer.removeListener('pty:data', ipcHandler)
      ipcHandler = null
    }

    return (callback: (paneId: string, data: string) => void) => {
      const id = Date.now() + Math.random()
      subscribers.set(id, callback)

      if (!ipcHandler) {
        ipcHandler = (_event: unknown, paneId: string, data: string) => {
          subscribers.forEach((cb) => cb(paneId, data))
        }
        ipcRenderer.on('pty:data', ipcHandler)
      }

      return () => {
        subscribers.delete(id)
        cleanupIpcListener()
      }
    }
  })(),
  ptyOnExit: (() => {
    const subscribers = new Map<number, (paneId: string) => void>()
    let ipcHandler: ((_event: Electron.IpcRendererEvent, paneId: string) => void) | null = null

    function cleanupIpcListener(): void {
      if (subscribers.size > 0 || !ipcHandler) return
      ipcRenderer.removeListener('pty:exit', ipcHandler)
      ipcHandler = null
    }

    return (callback: (paneId: string) => void) => {
      const id = Date.now() + Math.random()
      subscribers.set(id, callback)

      if (!ipcHandler) {
        ipcHandler = (_event: unknown, paneId: string) => {
          subscribers.forEach((cb) => cb(paneId))
        }
        ipcRenderer.on('pty:exit', ipcHandler)
      }

      return () => {
        subscribers.delete(id)
        cleanupIpcListener()
      }
    }
  })(),
  // Persistence
  loadProjects: () => ipcRenderer.invoke('persistence:loadProjects'),
  saveProjects: (projects: unknown[]) =>
    ipcRenderer.invoke('persistence:saveProjects', projects),
  loadWorktrees: (projectID: string) =>
    ipcRenderer.invoke('persistence:loadWorktrees', projectID),
  saveWorktrees: (projectID: string, worktrees: unknown[]) =>
    ipcRenderer.invoke('persistence:saveWorktrees', projectID, worktrees),
  removeWorktrees: (projectID: string) =>
    ipcRenderer.invoke('persistence:removeWorktrees', projectID),
  loadWorkspaces: () => ipcRenderer.invoke('persistence:loadWorkspaces'),
  saveWorkspaces: (workspaces: unknown[]) =>
    ipcRenderer.invoke('persistence:saveWorkspaces', workspaces),
  loadSelection: () => ipcRenderer.invoke('persistence:loadSelection'),
  saveSelection: (selection: Record<string, unknown>) =>
    ipcRenderer.invoke('persistence:saveSelection', selection),
  loadSettings: () => ipcRenderer.invoke('persistence:loadSettings'),
  saveSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('persistence:saveSettings', settings),
  // Dialog
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  // Window
  setTitle: (title: string) => ipcRenderer.invoke('window:setTitle', title),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (callback: (maximized: boolean) => void) => {
    const handler = (_event: unknown, maximized: boolean) => callback(maximized)
    ipcRenderer.on('window:maximizedChange', handler)
    ipcRenderer.send('window:onMaximizedChange')
    return () => {
      ipcRenderer.removeListener('window:maximizedChange', handler)
    }
  },
  // Git
  gitIsGitRepository: (repoPath: string) =>
    ipcRenderer.invoke('git:isGitRepository', repoPath),
  gitInitRepository: (repoPath: string) =>
    ipcRenderer.invoke('git:initRepository', repoPath),
  gitHasUncommittedChanges: (worktreePath: string) =>
    ipcRenderer.invoke('git:hasUncommittedChanges', worktreePath),
  gitListWorktrees: (repoPath: string) =>
    ipcRenderer.invoke('git:listWorktrees', repoPath),
  gitListBranches: (repoPath: string) =>
    ipcRenderer.invoke('git:listBranches', repoPath),
  gitAddWorktree: (repoPath: string, wtPath: string, branch: string, createBranch: boolean) =>
    ipcRenderer.invoke('git:addWorktree', repoPath, wtPath, branch, createBranch),
  gitRemoveWorktree: (repoPath: string, wtPath: string, force: boolean) =>
    ipcRenderer.invoke('git:removeWorktree', repoPath, wtPath, force),
  gitDeleteBranch: (repoPath: string, branch: string, force: boolean) =>
    ipcRenderer.invoke('git:deleteBranch', repoPath, branch, force),
  gitChangesFiles: (repoPath: string) =>
    ipcRenderer.invoke('git:changes-files', repoPath),
  gitDiffParse: (repoPath: string, filePath: string, isStaged: boolean, isUntracked: boolean) =>
    ipcRenderer.invoke('git:diff-parse', repoPath, filePath, isStaged, isUntracked),
  // Branch ops
  gitCurrentBranch: (repoPath: string) =>
    ipcRenderer.invoke('git:current-branch', repoPath),
  gitListAllBranches: (repoPath: string) =>
    ipcRenderer.invoke('git:listAllBranches', repoPath),
  gitSwitchBranch: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:switch-branch', repoPath, branch),
  gitCreateBranch: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:create-branch', repoPath, branch),
  gitCreateAndSwitchBranch: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:create-and-switch-branch', repoPath, branch),
  // Stage / unstage / discard
  gitStageFiles: (repoPath: string, paths: string[]) =>
    ipcRenderer.invoke('git:stage-files', repoPath, paths),
  gitUnstageFiles: (repoPath: string, paths: string[]) =>
    ipcRenderer.invoke('git:unstage-files', repoPath, paths),
  gitDiscardFiles: (repoPath: string, trackedPaths: string[], untrackedPaths: string[]) =>
    ipcRenderer.invoke('git:discard-files', repoPath, trackedPaths, untrackedPaths),
  // Commit / push / pull
  gitCommit: (repoPath: string, message: string) =>
    ipcRenderer.invoke('git:commit', repoPath, message),
  gitPush: (repoPath: string) =>
    ipcRenderer.invoke('git:push', repoPath),
  gitPushSetUpstream: (repoPath: string) =>
    ipcRenderer.invoke('git:push-set-upstream', repoPath),
  gitPull: (repoPath: string) =>
    ipcRenderer.invoke('git:pull', repoPath),
  gitFetch: (repoPath: string) =>
    ipcRenderer.invoke('git:fetch', repoPath),
  gitPullRebase: (repoPath: string) =>
    ipcRenderer.invoke('git:pull-rebase', repoPath),
  gitAheadBehind: (repoPath: string) =>
    ipcRenderer.invoke('git:ahead-behind', repoPath),
  // Commit log
  gitCommitLog: (repoPath: string, maxCount: number, skip: number) =>
    ipcRenderer.invoke('git:commit-log', repoPath, maxCount, skip),
  gitCherryPick: (repoPath: string, hash: string) =>
    ipcRenderer.invoke('git:cherry-pick', repoPath, hash),
  gitRevert: (repoPath: string, hash: string) =>
    ipcRenderer.invoke('git:revert', repoPath, hash),
  // PR operations
  gitPRInfo: (repoPath: string) =>
    ipcRenderer.invoke('git:pr-info', repoPath),
  gitPRList: (repoPath: string, state: string, limit: number) =>
    ipcRenderer.invoke('git:pr-list', repoPath, state, limit),
  gitPRCreate: (repoPath: string, params: { branch: string; baseBranch: string; title: string; body: string; draft: boolean }) =>
    ipcRenderer.invoke('git:pr-create', repoPath, params),
  gitPRMerge: (repoPath: string, number: number, method: string) =>
    ipcRenderer.invoke('git:pr-merge', repoPath, number, method),
  gitPRClose: (repoPath: string, number: number) =>
    ipcRenderer.invoke('git:pr-close', repoPath, number),
  gitPRCheckout: (repoPath: string, number: number) =>
    ipcRenderer.invoke('git:pr-checkout', repoPath, number),
  gitGhInstalled: () =>
    ipcRenderer.invoke('git:gh-installed'),
  gitListRemoteBranches: (repoPath: string) =>
    ipcRenderer.invoke('git:list-remote-branches', repoPath),
  gitDefaultBranch: (repoPath: string) =>
    ipcRenderer.invoke('git:default-branch', repoPath),
  gitStageAll: (repoPath: string) =>
    ipcRenderer.invoke('git:stage-all', repoPath),
  gitWatchStart: (repoPath: string) =>
    ipcRenderer.invoke('git:watch-start', repoPath),
  gitWatchStop: (repoPath: string) =>
    ipcRenderer.invoke('git:watch-stop', repoPath),
  onGitDirectoryChanged: (callback: (repoPath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, repoPath: string) => callback(repoPath)
    ipcRenderer.on('git:directory-changed', handler)
    return () => ipcRenderer.removeListener('git:directory-changed', handler)
  },
  // FS
  fsRemovePath: (targetPath: string) =>
    ipcRenderer.invoke('fs:removePath', targetPath),
  listDir: (dirPath: string) =>
    ipcRenderer.invoke('fs:listDir', dirPath),
  fsHasGitDir: (dirPath: string) =>
    ipcRenderer.invoke('fs:hasGitDir', dirPath),
  fsFindNestedRepos: (dirPath: string) =>
    ipcRenderer.invoke('fs:findNestedRepos', dirPath),
  readTextFile: (filePath: string) =>
    ipcRenderer.invoke('fs:readTextFile', filePath),
  getGhosttyThemesDir: () =>
    ipcRenderer.invoke('fs:getGhosttyThemesDir'),
  setWindowOpacity: (alpha: number) =>
    ipcRenderer.invoke('window:setOpacity', alpha),
  openVCSWindow: (repoPath: string) =>
    ipcRenderer.invoke('window:openVCSWindow', repoPath),
  // Clipboard
  clipboardWriteText: (text: string) => {
    void ipcRenderer.invoke('clipboard:writeText', text)
  },
  clipboardReadText: () =>
    ipcRenderer.invoke('clipboard:readText'),
  // Files
  findFiles: (projectPath: string, query: string, maxDepth?: number, maxResults?: number) =>
    ipcRenderer.invoke('files:find', { projectPath, query, maxDepth, maxResults }),
  // File Tree
  fileTreeReadDirectory: (directoryPath: string, repoRoot: string) =>
    ipcRenderer.invoke('fileTree:readDirectory', directoryPath, repoRoot),
  fileTreeGitStatusPaths: (repoRoot: string) =>
    ipcRenderer.invoke('fileTree:gitStatusPaths', repoRoot),
  fileTreeCreateFile: (name: string, directory: string) =>
    ipcRenderer.invoke('fileTree:createFile', name, directory),
  fileTreeCreateFolder: (name: string, directory: string) =>
    ipcRenderer.invoke('fileTree:createFolder', name, directory),
  fileTreeRename: (absolutePath: string, newName: string) =>
    ipcRenderer.invoke('fileTree:rename', absolutePath, newName),
  fileTreeTrash: (absolutePaths: string[]) =>
    ipcRenderer.invoke('fileTree:trash', absolutePaths),
  fileTreeMove: (sources: string[], destination: string) =>
    ipcRenderer.invoke('fileTree:move', sources, destination),
  fileTreeCopy: (sources: string[], destination: string) =>
    ipcRenderer.invoke('fileTree:copy', sources, destination),
  fileTreeRevealInFinder: (filePath: string) =>
    ipcRenderer.invoke('fileTree:revealInFinder', filePath),
  fileTreeStat: (filePath: string) =>
    ipcRenderer.invoke('fileTree:stat', filePath),
  // Editor File I/O
  editorFileRead: (filePath: string) =>
    ipcRenderer.invoke('editorFile:read', filePath),
  editorFileWrite: (filePath: string, content: string) =>
    ipcRenderer.invoke('editorFile:write', filePath, content),
  editorFileStat: (filePath: string) =>
    ipcRenderer.invoke('editorFile:stat', filePath),
  // Logo
  openImageFile: () =>
    ipcRenderer.invoke('dialog:openImageFile'),
  saveLogo: (imagePath: string, projectID: string) =>
    ipcRenderer.invoke('logo:save', imagePath, projectID),
  readLogo: (filename: string) =>
    ipcRenderer.invoke('logo:read', filename),
  removeLogo: (projectID: string) =>
    ipcRenderer.invoke('logo:remove', projectID),
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
