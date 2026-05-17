// Original: Muxy/Services/GhosttyRuntimeEventAdapter.swift
// Description: Renderer-side PTY service that wraps the IPC bridge. Maintains session
//              registry for cleanup. Input writes are batched via requestAnimationFrame
//              to reduce IPC overhead for rapid keystrokes and paste operations.
// Status: ✅ Completed

export interface PtySession {
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
  onData(callback: (data: string) => void): () => void
  onExit(callback: () => void): () => void
}

interface SessionState {
  listeners: Set<(data: string) => void>
  exitCallbacks: Set<() => void>
  writeBuffer: string
  writePending: boolean
  writeRAF: number
  unsubData: () => void
  unsubExit: () => void
}

const sessions = new Map<string, SessionState>()

function flushWrite(paneId: string): void {
  const state = sessions.get(paneId)
  if (!state) return
  state.writePending = false
  if (state.writeBuffer.length === 0) return
  const data = state.writeBuffer
  state.writeBuffer = ''
  try {
    void window.electronAPI.ptyWrite(paneId, data)
  } catch {
    // IPC or PTY may be closing
  }
}

function makeSession(paneId: string, state: SessionState): PtySession {
  return {
    write(data: string): void {
      state.writeBuffer += data
      if (!state.writePending) {
        state.writePending = true
        state.writeRAF = requestAnimationFrame(() => flushWrite(paneId))
      }
    },
    resize(cols: number, rows: number): void {
      void window.electronAPI.ptyResize(paneId, cols, rows)
    },
    kill(): void {
      if (state.writeRAF) {
        cancelAnimationFrame(state.writeRAF)
      }
      state.unsubData()
      state.unsubExit()
      state.listeners.clear()
      state.exitCallbacks.clear()
      sessions.delete(paneId)
      void window.electronAPI.ptyKill(paneId)
    },
    onData(callback: (data: string) => void): () => void {
      state.listeners.add(callback)
      return () => {
        state.listeners.delete(callback)
      }
    },
    onExit(callback: () => void): () => void {
      state.exitCallbacks.add(callback)
      return () => {
        state.exitCallbacks.delete(callback)
      }
    },
  }
}

export async function createPty(
  paneId: string,
  cols: number,
  rows: number,
  cwd?: string,
): Promise<PtySession> {
  await window.electronAPI.ptyCreate(paneId, cols, rows, cwd)

  const listeners = new Set<(data: string) => void>()
  const exitCallbacks = new Set<() => void>()

  const unsubData = window.electronAPI.ptyOnData((id, data) => {
    if (id === paneId) {
      listeners.forEach((cb) => cb(data))
    }
  })

  const unsubExit = window.electronAPI.ptyOnExit((id) => {
    if (id === paneId) {
      exitCallbacks.forEach((cb) => cb())
    }
  })

  const state: SessionState = {
    listeners,
    exitCallbacks,
    writeBuffer: '',
    writePending: false,
    writeRAF: 0,
    unsubData,
    unsubExit,
  }

  sessions.set(paneId, state)
  return makeSession(paneId, state)
}

export function destroyPtySession(paneId: string): void {
  const state = sessions.get(paneId)
  if (state) {
    if (state.writeRAF) {
      cancelAnimationFrame(state.writeRAF)
    }
    state.unsubData()
    state.unsubExit()
    state.listeners.clear()
    state.exitCallbacks.clear()
    sessions.delete(paneId)
  }
  void window.electronAPI.ptyKill(paneId)
}
