// Original: N/A — performance infrastructure
// Description: IndexedDB-backed scrollback storage. Serializes terminal state
//              when frozen and restores on resume. Also provides periodic
//              persistence for crash recovery across long sessions.
// Status: Completed

import { Terminal } from 'xterm'
import type { SerializeAddon } from '@xterm/addon-serialize'

const DB_NAME = 'nana-scrollback'
const DB_VERSION = 1
const STORE_NAME = 'scrollbacks'

interface ScrollbackRecord {
  paneId: string
  serialized: string
  timestamp: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'paneId' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error instanceof Error ? request.error : new Error(String(request.error)))
  })

  return dbPromise
}

export const scrollbackStore = {
  async save(
    _term: Terminal,
    serializeAddon: SerializeAddon,
    paneId: string,
  ): Promise<void> {
    try {
      const db = await openDB()
      const serialized = serializeAddon.serialize()

      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put({
        paneId,
        serialized,
        timestamp: Date.now(),
      })

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error instanceof Error ? tx.error : new Error(String(tx.error)))
      })
    } catch {
      // IndexedDB save failure is non-critical
    }
  },

  async load(paneId: string): Promise<string | null> {
    try {
      const db = await openDB()

      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(paneId)

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const record = request.result as ScrollbackRecord | undefined
          resolve(record?.serialized ?? null)
        }
        request.onerror = () => reject(request.error instanceof Error ? request.error : new Error(String(request.error)))
      })
    } catch {
      return null
    }
  },

  async remove(paneId: string): Promise<void> {
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(paneId)
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error instanceof Error ? tx.error : new Error(String(tx.error)))
      })
    } catch {
      // Non-critical
    }
  },

  async clearAll(): Promise<void> {
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).clear()
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error instanceof Error ? tx.error : new Error(String(tx.error)))
      })
    } catch {
      // Non-critical
    }
  },
}
