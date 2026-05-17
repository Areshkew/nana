import { app, BrowserWindow, ipcMain, shell, clipboard } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { registerPtyHandlers } from './ipc-handlers/pty.js'
import { registerPersistenceHandlers } from './ipc-handlers/persistence.js'
import { registerDialogHandlers } from './ipc-handlers/dialog.js'
import { registerWindowHandlers } from './ipc-handlers/window.js'
import { registerGitHandlers } from './ipc-handlers/git.js'
import { registerGitWatcherHandlers } from './ipc-handlers/gitWatcher.js'
import { registerFilesHandlers } from './ipc-handlers/files.js'
import { registerFileTreeHandlers } from './ipc-handlers/fileTree.js'
import { registerEditorFileHandlers } from './ipc-handlers/editorFile.js'
import { registerLogoHandlers } from './ipc-handlers/logo.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundMaterial: 'acrylic',
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp'],
      },
    })
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../../out/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
}

void app.whenReady().then(() => {
  registerPtyHandlers()
  registerPersistenceHandlers()
  registerDialogHandlers()
  registerWindowHandlers()
  registerGitHandlers()
  registerGitWatcherHandlers()
  registerFilesHandlers()
  registerFileTreeHandlers()
  registerEditorFileHandlers()
  registerLogoHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

let isQuitting = false

app.on('before-quit', () => {
  isQuitting = true
  ipcMain.emit('pty:killAll')
})

process.on('uncaughtException', (error) => {
  if (isQuitting && error.message?.includes('destroyed')) return
  // Swallow PTY socket errors (EAGAIN, ECONNRESET) to prevent crashes when
  // the child process exits while writes are pending.
  if (
    error.message?.includes('EAGAIN') ||
    error.message?.includes('ECONNRESET') ||
    error.message?.includes('EIO') ||
    error.message?.includes(' Broken pipe')
  ) {
    return
  }
  throw error
})

app.on('window-all-closed', () => {
  ipcMain.emit('pty:killAll')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers will be registered here incrementally
ipcMain.handle('app:platform', () => process.platform)

ipcMain.handle('app:getWorktreePath', (_event, projectID: string, slug: string) => {
  if (typeof projectID !== 'string' || typeof slug !== 'string') {
    throw new Error('Invalid params')
  }
  return path.join(app.getPath('userData'), 'worktree-checkouts', projectID, slug)
})

ipcMain.handle('fs:removePath', async (_event, targetPath: string) => {
  if (typeof targetPath !== 'string' || targetPath.length === 0) {
    throw new Error('Invalid path')
  }
  const resolved = path.resolve(targetPath)
  const safeRoot = path.resolve(app.getPath('userData'))
  // Case-insensitive check on Windows
  const isWindows = process.platform === 'win32'
  const inBounds = isWindows
    ? resolved.toLowerCase().startsWith(safeRoot.toLowerCase())
    : resolved.startsWith(safeRoot)
  if (!inBounds) {
    throw new Error('Path outside allowed directory')
  }
  // maxRetries helps on Windows where files may be briefly locked
  await fs.rm(resolved, { recursive: true, force: true, maxRetries: 3 })
})

// Clipboard
ipcMain.handle('clipboard:writeText', (_event, text: string) => {
  if (typeof text !== 'string') throw new Error('Invalid clipboard text')
  clipboard.writeText(text)
})

ipcMain.handle('clipboard:readText', () => {
  return clipboard.readText()
})
