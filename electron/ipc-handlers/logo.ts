// Original: Muxy/Services/ProjectLogoStorage.swift + ProjectRow.swift pickLogoImage
// Description: IPC handlers for project logo image pick, save, read, and remove.
// Status: 🚧 In progress

import { ipcMain, dialog, BrowserWindow, nativeImage, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

const LOGO_SIZE = 64

function logosDirectory(): string {
  return path.join(app.getPath('userData'), 'logos')
}

async function ensureLogosDir(): Promise<string> {
  const dir = logosDirectory()
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export function registerLogoHandlers(): void {
  ipcMain.handle('dialog:openImageFile', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(focusedWindow ?? undefined, {
      properties: ['openFile'],
      title: 'Choose a Logo Image',
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
      ],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('logo:save', async (_event, imagePath: string, projectID: string) => {
    if (typeof imagePath !== 'string' || typeof projectID !== 'string') {
      throw new Error('Invalid logo:save params')
    }

    const img = nativeImage.createFromPath(imagePath)
    if (img.isEmpty()) {
      throw new Error('Failed to load image')
    }

    const size = img.getSize()
    const minDim = Math.min(size.width, size.height)
    const x = Math.floor((size.width - minDim) / 2)
    const y = Math.floor((size.height - minDim) / 2)

    const cropped = img.crop({ x, y, width: minDim, height: minDim })
    const resized = cropped.resize({ width: LOGO_SIZE, height: LOGO_SIZE })
    const pngBuffer = resized.toPNG()

    const dir = await ensureLogosDir()
    const filename = `${projectID}.png`
    const destPath = path.join(dir, filename)

    await fs.writeFile(destPath, pngBuffer)
    return filename
  })

  ipcMain.handle('logo:read', async (_event, filename: string) => {
    if (typeof filename !== 'string') {
      throw new Error('Invalid logo:read params')
    }
    const filePath = path.join(logosDirectory(), filename)
    try {
      const data = await fs.readFile(filePath)
      return `data:image/png;base64,${data.toString('base64')}`
    } catch {
      return null
    }
  })

  ipcMain.handle('logo:remove', async (_event, projectID: string) => {
    if (typeof projectID !== 'string') {
      throw new Error('Invalid logo:remove params')
    }
    const filePath = path.join(logosDirectory(), `${projectID}.png`)
    try {
      await fs.unlink(filePath)
    } catch {
      // File may not exist — ignore
    }
  })
}
