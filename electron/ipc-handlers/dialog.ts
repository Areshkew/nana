// Original: NSOpenPanel → dialog.showOpenDialog
// Description: Folder picker IPC handler for adding projects.
// Status: ✅ Completed

import { ipcMain, dialog, BrowserWindow } from 'electron'

export function registerDialogHandlers(): void {
  ipcMain.handle('dialog:openDirectory', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(focusedWindow ?? undefined, {
      properties: ['openDirectory'],
      title: 'Select Project Folder',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}
