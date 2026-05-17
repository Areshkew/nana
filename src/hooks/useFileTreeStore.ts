// Original: Muxy/Views/MainWindow.swift — fileTreeStates dictionary
// Description: Manages per-worktree file tree store instances. Creates/disposes as worktrees change.
// Status: Completed

import { useRef } from 'react'
import { createFileTreeStore, type FileTreeStoreApi } from '../stores/fileTreeStore'

const storeCache = new Map<string, FileTreeStoreApi>()

export function getFileTreeStore(repoPath: string): FileTreeStoreApi {
  let store = storeCache.get(repoPath)
  if (!store) {
    store = createFileTreeStore(repoPath)
    storeCache.set(repoPath, store)
  }
  return store
}

export function useFileTreeStore(repoPath: string): FileTreeStoreApi {
  const ref = useRef<FileTreeStoreApi | null>(null)
  if (!ref.current || ref.current?.getState().rootPath !== repoPath) {
    if (ref.current?.getState().rootPath !== repoPath) {
      // Don't dispose — the old store may be reused later
    }
    ref.current = getFileTreeStore(repoPath)
  }
  return ref.current
}

export function disposeFileTreeStore(repoPath: string): void {
  const store = storeCache.get(repoPath)
  if (store) {
    store.getState().dispose()
    storeCache.delete(repoPath)
  }
}
