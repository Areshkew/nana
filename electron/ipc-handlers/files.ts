// Original: Muxy/Services/FileSearchService.swift
// Description: IPC handler for file system search operations (cross-platform `find` alternative).
// Status: Completed

import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'

const PRUNED_DIRS = new Set([
  '.git', 'node_modules', '.build', 'build', 'DerivedData',
  '__pycache__', '.venv', 'venv', 'dist', '.next', '.nuxt',
  'target', 'Pods', '.swiftpm', '.idea', '.vscode',
  'vendor', 'coverage', '.cache', '.parcel-cache',
])

interface FileResult {
  absolutePath: string
  relativePath: string
  fileName: string
}

interface FindFilesOptions {
  projectPath: string
  query: string
  maxDepth?: number
  maxResults?: number
}

export function registerFilesHandlers(): void {
  ipcMain.handle('files:find', async (_event, options: FindFilesOptions) => {
    if (!options || typeof options.projectPath !== 'string') {
      throw new Error('Invalid params: projectPath required')
    }
    const query = typeof options.query === 'string' ? options.query : ''
    const maxDepth = typeof options.maxDepth === 'number' ? options.maxDepth : 4
    const maxResults = typeof options.maxResults === 'number' ? options.maxResults : 500

    const results: FileResult[] = []

    const normalizedQuery = query.toLowerCase()
    const patternPieces = normalizedQuery
      .replace(/[^a-z0-9._\-/ ]/g, '')
      .split(/\s+/)
      .filter(Boolean)

    async function walk(dir: string, depth: number): Promise<void> {
      if (depth > maxDepth || results.length >= maxResults) return
      let entries
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (results.length >= maxResults) break
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (PRUNED_DIRS.has(entry.name)) continue
          await walk(fullPath, depth + 1)
        } else if (entry.isFile()) {
          const relative = path.relative(options.projectPath, fullPath)
          if (patternPieces.length > 0) {
            const lower = relative.toLowerCase()
            if (!patternPieces.every((p) => lower.includes(p))) continue
          }
          results.push({
            absolutePath: fullPath,
            relativePath: relative,
            fileName: entry.name,
          })
        }
      }
    }

    await walk(options.projectPath, 1)

    return results.slice(0, maxResults)
  })

  ipcMain.handle('fs:hasGitDir', async (_event, dirPath: string) => {
    if (typeof dirPath !== 'string') return false
    try {
      const stat = await fs.stat(path.join(dirPath, '.git'))
      return stat.isDirectory() || stat.isFile()
    } catch {
      return false
    }
  })

  ipcMain.handle('fs:findNestedRepos', async (_event, dirPath: string) => {
    if (typeof dirPath !== 'string') throw new Error('Invalid dirPath')
    let entries
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return []
    }
    const nested: string[] = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const gitPath = path.join(dirPath, entry.name, '.git')
      try {
        const stat = await fs.stat(gitPath)
        if (stat.isDirectory() || stat.isFile()) {
          nested.push(entry.name)
        }
      } catch {
        // .git does not exist — not a repo
      }
    }
    return nested
  })
}
