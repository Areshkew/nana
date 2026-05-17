// Original: Muxy/Services/FileTreeService.swift — prune list, sanitize, unique name
// Description: Pure helper functions for file tree operations (no Electron deps).
// Status: ✅ Completed

import path from 'path'
import fs from 'fs/promises'

export const PRUNED_NAMES = new Set([
  '.git', 'node_modules', '.build', 'build', 'DerivedData',
  '__pycache__', '.venv', 'venv', 'dist', '.next', '.nuxt',
  'target', 'Pods', '.swiftpm', '.idea', '.vscode',
  'vendor', 'coverage', '.cache', '.parcel-cache', '.tox',
  '.mypy_cache', '.pytest_cache', '.sass-cache', '.terraform',
  '.gradle', '.mvn', '.nuget', 'bin', 'obj', 'out',
  '.classpath', '.project', '.settings', ' *.egg-info',
])

export function sanitize(rawName: string): string {
  const trimmed = rawName.trim()
  if (!trimmed || trimmed.includes('/') || trimmed === '.' || trimmed === '..') {
    throw new Error('Invalid name')
  }
  return trimmed
}

export async function uniquePath(name: string, directory: string): Promise<string> {
  const base = path.join(directory, name)
  try {
    await fs.access(base)
  } catch {
    return base
  }
  const ext = path.extname(name)
  const stem = path.basename(name, ext)
  let counter = 2
  while (true) {
    const candidateName = ext ? `${stem} ${counter}${ext}` : `${stem} ${counter}`
    const candidate = path.join(directory, candidateName)
    try {
      await fs.access(candidate)
    } catch {
      return candidate
    }
    counter++
  }
}

export function isInsidePath(target: string, ancestor: string): boolean {
  const normalized = ancestor.endsWith('/') ? ancestor.slice(0, -1) : ancestor
  return target === normalized || target.startsWith(normalized + path.sep)
}
