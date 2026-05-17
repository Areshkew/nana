// Original: Muxy/Models/EditorTabState.swift (loadFile/saveFile)
// Description: IPC handlers for reading, writing, and stating files for the built-in editor.
// Status: 🚧 In progress

import { ipcMain } from 'electron'
import fs from 'fs/promises'

export function registerEditorFileHandlers(): void {
  ipcMain.handle('editorFile:read', async (_event, filePath: string) => {
    if (typeof filePath !== 'string' || filePath.length === 0) {
      throw new Error('Invalid file path')
    }
    return fs.readFile(filePath, 'utf-8')
  })

  ipcMain.handle('editorFile:write', async (_event, filePath: string, content: string) => {
    if (typeof filePath !== 'string' || filePath.length === 0) {
      throw new Error('Invalid file path')
    }
    if (typeof content !== 'string') {
      throw new Error('Invalid content')
    }
    await fs.writeFile(filePath, content, 'utf-8')
  })

  ipcMain.handle('editorFile:stat', async (_event, filePath: string) => {
    if (typeof filePath !== 'string' || filePath.length === 0) {
      throw new Error('Invalid file path')
    }
    const stat = await fs.stat(filePath)
    return {
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      isDirectory: stat.isDirectory(),
      isReadOnly: false,
    }
  })
}
