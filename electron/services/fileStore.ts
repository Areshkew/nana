// Original: Muxy/Services/CodableFileStore.swift + Muxy/Services/JSONFilePersistence.swift
// Description: Generic JSON file persistence for main process.
// Status: ✅ Completed

import fs from 'fs/promises'
import path from 'path'

export interface FileStoreOptions {
  prettyPrinted?: boolean
  sortedKeys?: boolean
}

export class JSONFileStore<T> {
  constructor(
    private filePath: string,
    private options: FileStoreOptions = {},
  ) {}

  async load(): Promise<T | null> {
    try {
      await fs.access(this.filePath)
      const data = await fs.readFile(this.filePath, 'utf-8')
      return JSON.parse(data) as T
    } catch {
      return null
    }
  }

  async save(value: T): Promise<void> {
    const replacer = this.options.sortedKeys
      ? Object.keys(value as object).sort()
      : undefined
    const space = this.options.prettyPrinted ? 2 : undefined
    const data = JSON.stringify(value, replacer, space)
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    await fs.writeFile(this.filePath, data, 'utf-8')
  }

  async remove(): Promise<void> {
    try {
      await fs.unlink(this.filePath)
    } catch {
      // File may not exist
    }
  }
}

export function getUserDataPath(app: Electron.App): string {
  return app.getPath('userData')
}

export function getConfigPath(app: Electron.App, filename: string): string {
  return path.join(getUserDataPath(app), filename)
}
