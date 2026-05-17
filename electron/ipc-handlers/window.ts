// Original: WindowTitleUpdater in MainWindow.swift
// Description: IPC handlers for window title and frameless window controls.
// Status: ✅ Completed

import { ipcMain, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const maximizedHandlers = new Map<number, { handler: () => void; sender: Electron.WebContents }>()

export function registerWindowHandlers(): void {
  ipcMain.handle('window:setTitle', (_event, title: string) => {
    if (typeof title !== 'string') throw new Error('Invalid title')
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.setTitle(title)
    }
  })

  ipcMain.handle('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.handle('window:close', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.close()
  })

  ipcMain.handle('window:isMaximized', () => {
    const win = BrowserWindow.getFocusedWindow()
    return win?.isMaximized() ?? false
  })

  ipcMain.handle('window:setOpacity', (_event, alpha: number) => {
    if (typeof alpha !== 'number' || alpha < 0 || alpha > 1) throw new Error('Invalid alpha')
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.setOpacity(alpha)
  })

  ipcMain.handle('window:openVCSWindow', (_event, repoPath: string) => {
    if (typeof repoPath !== 'string' || repoPath.length === 0) throw new Error('Invalid repoPath')
    const vcsWin = new BrowserWindow({
      width: 480,
      height: 700,
      minWidth: 360,
      minHeight: 400,
      frame: false,
      titleBarStyle: 'hidden',
      backgroundMaterial: 'acrylic',
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    vcsWin.setTitle('Source Control')
    if (process.env.VITE_DEV_SERVER_URL) {
      void vcsWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}?view=vcs&repoPath=${encodeURIComponent(repoPath)}`)
    } else {
      void vcsWin.loadFile(path.join(__dirname, '../../out/index.html'), {
        query: { view: 'vcs', repoPath },
      })
    }
  })

  ipcMain.handle('fs:listDir', async (_event, dirPath: string) => {
    if (typeof dirPath !== 'string') throw new Error('Invalid path')
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries.filter((e) => e.isFile()).map((e) => e.name)
  })

  ipcMain.handle('fs:readTextFile', async (_event, filePath: string) => {
    if (typeof filePath !== 'string') throw new Error('Invalid path')
    return fs.readFile(filePath, 'utf-8')
  })

  ipcMain.handle('fs:getGhosttyThemesDir', async () => {
    const candidates: string[] = []

    if (process.platform === 'win32') {
      const appData = process.env.APPDATA
      if (appData) {
        candidates.push(path.join(appData, 'ghostty', 'themes'))
      }
      const home = process.env.USERPROFILE ?? process.env.HOME
      if (home) {
        candidates.push(path.join(home, '.config', 'ghostty', 'themes'))
      }
    } else if (process.platform === 'darwin') {
      const home = process.env.HOME
      if (home) {
        candidates.push(path.join(home, '.config', 'ghostty', 'themes'))
        candidates.push(path.join(home, 'Library', 'Application Support', 'com.mitchellh.ghostty', 'themes'))
      }
    } else {
      const home = process.env.HOME ?? process.env.USERPROFILE
      if (home) {
        candidates.push(path.join(home, '.config', 'ghostty', 'themes'))
      }
      const xdg = process.env.XDG_CONFIG_HOME
      if (xdg) {
        candidates.push(path.join(xdg, 'ghostty', 'themes'))
      }
    }

    for (const dir of candidates) {
      try {
        await fs.access(dir)
        return dir
      } catch {
        continue
      }
    }
    return null
  })

  ipcMain.on('window:onMaximizedChange', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    const senderId = event.sender.id

    const cleanup = (): void => {
      const entry = maximizedHandlers.get(senderId)
      if (!entry) return
      const owner = BrowserWindow.fromWebContents(entry.sender)
      if (owner) {
        owner.removeListener('maximize', entry.handler)
        owner.removeListener('unmaximize', entry.handler)
      }
      maximizedHandlers.delete(senderId)
    }

    cleanup()

    const handler = (): void => {
      const entry = maximizedHandlers.get(senderId)
      if (!entry) return
      try {
        entry.sender.send('window:maximizedChange', win.isMaximized())
      } catch {
        cleanup()
      }
    }

    maximizedHandlers.set(senderId, { handler, sender: event.sender })
    win.on('maximize', handler)
    win.on('unmaximize', handler)

    event.sender.on('destroyed', cleanup)
  })
}
