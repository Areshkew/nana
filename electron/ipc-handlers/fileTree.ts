// Original: Muxy/Services/FileTreeService.swift + Muxy/Services/FileSystemOperations.swift
// Description: IPC handlers for file tree directory listing, gitignore filtering, and file operations.
// Status: Completed

import { ipcMain, shell } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { PRUNED_NAMES, sanitize, uniquePath, isInsidePath } from './fileTreeUtils'

const execFileAsync = promisify(execFile)

interface DirCacheEntry {
  entries: FileTreeEntryDTO[]
  timestamp: number
}

const dirCache = new Map<string, DirCacheEntry>()
const DIR_CACHE_TTL = 2000

interface FileTreeEntryDTO {
  name: string
  absolutePath: string
  relativePath: string
  isDirectory: boolean
  isIgnored: boolean
}

// gitCheckIgnore is available for future use when per-directory .gitignore
// precision is needed. Currently we use a fast PRUNED_NAMES set instead.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _gitCheckIgnore(
  directoryAbsolutePath: string,
  candidates: string[],
): Promise<Set<string>> {
  if (candidates.length === 0) return new Set()
  try {
    const stdin = candidates.join('\0')
    const { stdout } = await execFileAsync('git', ['check-ignore', '-z', '--stdin'], {
      cwd: directoryAbsolutePath,
      encoding: 'utf-8',
      timeout: 5000,
      input: stdin,
    })
    const ignored = new Set<string>()
    if (stdout) {
      for (const part of stdout.split('\0')) {
        const name = part.trim()
        if (name) ignored.add(path.basename(name))
      }
    }
    return ignored
  } catch {
    return new Set()
  }
}

async function readDirectoryEntries(
  directoryPath: string,
  repoRoot: string,
): Promise<FileTreeEntryDTO[]> {
  const cacheKey = `${directoryPath}::${repoRoot}`
  const cached = dirCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < DIR_CACHE_TTL) {
    return cached.entries
  }

  let names: string[]
  try {
    names = await fs.readdir(directoryPath)
  } catch {
    return []
  }

  const normalizedRoot = repoRoot.endsWith('/') ? repoRoot.slice(0, -1) : repoRoot
  const isInsideRepo =
    directoryPath === normalizedRoot ||
    directoryPath.startsWith(normalizedRoot + path.sep)

  const entries: FileTreeEntryDTO[] = []

  for (const name of names) {
    if (name === '.' || name === '..') continue
    if (isInsideRepo && name === '.git') continue

    const absolute = path.join(directoryPath, name)
    let isDir = false
    try {
      const stat = await fs.stat(absolute)
      isDir = stat.isDirectory()
    } catch {
      continue
    }

    const isIgnored = isInsideRepo && PRUNED_NAMES.has(name)

    const relative = absolute.startsWith(normalizedRoot + path.sep)
      ? absolute.slice(normalizedRoot.length + 1)
      : name

    entries.push({
      name,
      absolutePath: absolute,
      relativePath: relative,
      isDirectory: isDir,
      isIgnored,
    })
  }

  entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

  dirCache.set(cacheKey, { entries, timestamp: Date.now() })

  return entries
}

export function registerFileTreeHandlers(): void {
  ipcMain.handle(
    'fileTree:readDirectory',
    async (_event, directoryPath: string, repoRoot: string) => {
      if (typeof directoryPath !== 'string' || typeof repoRoot !== 'string') {
        throw new Error('Invalid params')
      }
      return readDirectoryEntries(directoryPath, repoRoot)
    },
  )

  ipcMain.handle(
    'fileTree:gitStatusPaths',
    async (_event, repoRoot: string) => {
      if (typeof repoRoot !== 'string') throw new Error('Invalid repoRoot')
      try {
        const { stdout } = await execFileAsync(
          'git',
          ['-C', repoRoot, '-c', 'core.quotepath=false', 'status', '--porcelain=v1', '-z', '--untracked-files=normal'],
          { encoding: 'utf-8', timeout: 10000 },
        )
        const statuses: Record<string, string> = {}
        let i = 0
        while (i < stdout.length) {
          const x = stdout[i]
          const y = stdout[i + 1]
          i += 3
          let filePath = ''
          while (i < stdout.length && stdout[i] !== '\0') {
            filePath += stdout[i]
            i++
          }
          i++
          if (!filePath) continue

          const xy = x + y
          let status: string
          if (xy === '??') status = 'untracked'
          else if (xy === '!!') continue
          else if (x === 'A' || y === 'A') status = 'added'
          else if (x === 'D' || y === 'D') status = 'deleted'
          else if (x === 'R' || y === 'R') status = 'renamed'
          else if (x === 'U' || y === 'U' || xy === 'AA' || xy === 'DD') status = 'conflict'
          else status = 'modified'

          statuses[filePath] = status

          if ((x === 'R' || y === 'R') && i < stdout.length && stdout[i] !== '\0') {
            while (i < stdout.length && stdout[i] !== '\0') i++
            i++
          }
        }
        return statuses
      } catch {
        return {}
      }
    },
  )

  ipcMain.handle(
    'fileTree:createFile',
    async (_event, name: string, directory: string) => {
      if (typeof name !== 'string' || typeof directory !== 'string') {
        throw new Error('Invalid params')
      }
      const clean = sanitize(name)
      const target = await uniquePath(clean, directory)
      const handle = await fs.open(target, 'w')
      await handle.close()
      return target
    },
  )

  ipcMain.handle(
    'fileTree:createFolder',
    async (_event, name: string, directory: string) => {
      if (typeof name !== 'string' || typeof directory !== 'string') {
        throw new Error('Invalid params')
      }
      const clean = sanitize(name)
      const target = await uniquePath(clean, directory)
      await fs.mkdir(target, { recursive: false })
      return target
    },
  )

  ipcMain.handle(
    'fileTree:rename',
    async (_event, absolutePath: string, newName: string) => {
      if (typeof absolutePath !== 'string' || typeof newName !== 'string') {
        throw new Error('Invalid params')
      }
      const clean = sanitize(newName)
      const parent = path.dirname(absolutePath)
      const currentName = path.basename(absolutePath)
      if (clean === currentName) return absolutePath
      const candidate = path.join(parent, clean)
      try {
        await fs.access(candidate)
        throw new Error(`Destination exists: ${candidate}`)
      } catch (err: unknown) {
        if (err instanceof Error && err.message.startsWith('Destination exists:')) throw err
      }
      await fs.rename(absolutePath, candidate)
      return candidate
    },
  )

  ipcMain.handle(
    'fileTree:trash',
    async (_event, absolutePaths: string[]) => {
      if (!Array.isArray(absolutePaths)) throw new Error('Invalid params')
      for (const p of absolutePaths) {
        if (typeof p !== 'string') throw new Error('Invalid path')
        await shell.trashItem(p).catch(() => fs.rm(p, { recursive: true, force: true }))
      }
    },
  )

  ipcMain.handle(
    'fileTree:move',
    async (_event, sources: string[], destination: string) => {
      if (!Array.isArray(sources) || typeof destination !== 'string') {
        throw new Error('Invalid params')
      }
      const results: string[] = []
      for (const source of sources) {
        const name = path.basename(source)
        const sourceParent = path.dirname(source)
        if (sourceParent === destination) {
          results.push(source)
          continue
        }
        if (isInsidePath(destination, source)) {
          throw new Error("Can't move a folder into itself")
        }
        const target = await uniquePath(name, destination)
        await fs.rename(source, target)
        results.push(target)
      }
      return results
    },
  )

  ipcMain.handle(
    'fileTree:copy',
    async (_event, sources: string[], destination: string) => {
      if (!Array.isArray(sources) || typeof destination !== 'string') {
        throw new Error('Invalid params')
      }
      const results: string[] = []
      for (const source of sources) {
        const name = path.basename(source)
        const target = await uniquePath(name, destination)
        const stat = await fs.stat(source)
        if (stat.isDirectory()) {
          await fs.cp(source, target, { recursive: true })
        } else {
          await fs.copyFile(source, target)
        }
        results.push(target)
      }
      return results
    },
  )

  ipcMain.handle(
    'fileTree:revealInFinder',
    (_event, filePath: string) => {
      if (typeof filePath !== 'string') throw new Error('Invalid path')
      shell.showItemInFolder(filePath)
    },
  )

  ipcMain.handle(
    'fileTree:stat',
    async (_event, filePath: string) => {
      if (typeof filePath !== 'string') throw new Error('Invalid path')
      try {
        const stat = await fs.stat(filePath)
        return { exists: true, isDirectory: stat.isDirectory(), size: stat.size }
      } catch {
        return { exists: false, isDirectory: false, size: 0 }
      }
    },
  )
}
