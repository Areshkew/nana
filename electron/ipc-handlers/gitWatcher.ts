// Original: Muxy/Services/GitDirectoryWatcher.swift
// Description: Main-process git directory watcher using chokidar. Watches repo root,
//              filters .git lock files, debounces changes, notifies renderer via IPC.
// Status: Completed

import { ipcMain, BrowserWindow } from 'electron'
import * as chokidar from 'chokidar'
import { join } from 'path'

const watchers = new Map<string, { watcher: chokidar.FSWatcher; timer: ReturnType<typeof setTimeout> | null }>()

function debounce(repoPath: string, delay: number): void {
  const entry = watchers.get(repoPath)
  if (!entry) return
  if (entry.timer) clearTimeout(entry.timer)
  entry.timer = setTimeout(() => {
    entry.timer = null
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('git:directory-changed', repoPath)
    }
  }, delay)
}

export function registerGitWatcherHandlers(): void {
  ipcMain.handle('git:watch-start', (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') return
    if (watchers.has(repoPath)) return

    const gitDir = join(repoPath, '.git')
    const watcher = chokidar.watch(gitDir, {
      persistent: true,
      ignoreInitial: true,
      ignored: [
        '**/objects/**',
        '**/*.lock',
        '**/*.sample',
        '**/logs/**',
      ],
      depth: 3,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    })

    watcher.on('all', () => {
      debounce(repoPath, 500)
    })

    watchers.set(repoPath, { watcher, timer: null })
  })

  ipcMain.handle('git:watch-stop', (_event, repoPath: string) => {
    if (typeof repoPath !== 'string') return
    const entry = watchers.get(repoPath)
    if (!entry) return
    if (entry.timer) clearTimeout(entry.timer)
    void entry.watcher.close()
    watchers.delete(repoPath)
  })
}
