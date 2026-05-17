// Original: N/A — project infrastructure service
// Description: Registry for terminal lifecycle management (freeze/resume).
//              Allows TabAreaView to freeze hidden terminals and resume visible ones
//              without requiring useEffect in components.
// Status: Completed

import { Terminal } from 'xterm'
import type { FitAddon } from 'xterm-addon-fit'
import type { SerializeAddon } from '@xterm/addon-serialize'
import type { PtySession } from './ptyService'

interface TerminalEntry {
  term: Terminal
  fitAddon: FitAddon
  serializeAddon: SerializeAddon
  pty?: PtySession
  frozen: boolean
  pendingData: string[]
  flushRAF: number
  paneId: string
  savedScrollTop: number
  lastCols?: number
  lastRows?: number
}

interface RetainedPane {
  pty: PtySession
  serialized: string
}

const entries = new Map<string, TerminalEntry>()
const retainedPanes = new Map<string, RetainedPane>()

export function registerTerminalLifecycle(
  paneId: string,
  term: Terminal,
  fitAddon: FitAddon,
  serializeAddon: SerializeAddon,
): void {
  entries.set(paneId, {
    term,
    fitAddon,
    serializeAddon,
    frozen: false,
    pendingData: [],
    flushRAF: 0,
    paneId,
    savedScrollTop: 0,
  })
}

export function setTerminalLifecyclePty(paneId: string, pty: PtySession): void {
  const entry = entries.get(paneId)
  if (entry) {
    entry.pty = pty
  }
}

export function unregisterTerminalLifecycle(paneId: string): void {
  const entry = entries.get(paneId)
  if (entry?.flushRAF) {
    cancelAnimationFrame(entry.flushRAF)
  }
  entries.delete(paneId)
}

function flushPending(entry: TerminalEntry): void {
  entry.flushRAF = 0
  if (entry.pendingData.length === 0) return
  const chunk = entry.pendingData.join('')
  entry.pendingData.length = 0
  entry.term.write(chunk)
}

export function queueTerminalData(paneId: string, data: string): void {
  const entry = entries.get(paneId)
  if (!entry) return
  if (entry.frozen) {
    entry.pendingData.push(data)
    return
  }
  entry.pendingData.push(data)
  if (!entry.flushRAF) {
    entry.flushRAF = requestAnimationFrame(() => flushPending(entry))
  }
}

export function freezeTerminal(paneId: string): void {
  const entry = entries.get(paneId)
  if (!entry || entry.frozen) return

  entry.frozen = true

  // Save scroll position before freezing
  entry.savedScrollTop = entry.term.buffer.active.baseY + entry.term.rows - 1

  // Cancel any pending flush
  if (entry.flushRAF) {
    cancelAnimationFrame(entry.flushRAF)
    entry.flushRAF = 0
  }
}

export function focusTerminal(paneId: string): void {
  const entry = entries.get(paneId)
  if (!entry) return
  try {
    entry.term.focus()
  } catch {
    // terminal may not be ready
  }
}

export function resumeTerminal(paneId: string): void {
  const entry = entries.get(paneId)
  if (!entry?.frozen) return

  entry.frozen = false
  focusTerminal(paneId)

  const rafId = requestAnimationFrame(() => {
    let fitFailed = false
    const prevCols = entry.term.cols
    const prevRows = entry.term.rows
    const wasAlternate = entry.term.buffer.active.type === 'alternate'

    try {
      entry.fitAddon.fit()
    } catch {
      fitFailed = true
      // Container may have zero dimensions; still try to flush data
    }

    if (!fitFailed && !wasAlternate && (entry.term.cols !== prevCols || entry.term.rows !== prevRows)) {
      const lastCols = entry.lastCols ?? -1
      const lastRows = entry.lastRows ?? -1
      if (entry.term.cols !== lastCols || entry.term.rows !== lastRows) {
        entry.pty?.resize(entry.term.cols, entry.term.rows)
        entry.lastCols = entry.term.cols
        entry.lastRows = entry.term.rows
      }
    }

    const maxBase = entry.term.buffer.active.baseY
    if (entry.savedScrollTop > 0) {
      const targetBase = Math.min(entry.savedScrollTop - entry.term.rows + 1, maxBase)
      if (targetBase > 0) {
        entry.term.scrollLines(-(maxBase - targetBase))
      }
    }

    if (entry.pendingData.length > 0) {
      const chunk = entry.pendingData.join('')
      entry.pendingData.length = 0
      try {
        entry.term.write(chunk)
      } catch {
        // terminal may have been disposed
      }
    }

    // Force full repaint after resume to clear any stale state
    try {
      entry.term.refresh(0, entry.term.rows - 1)
    } catch {
      // renderer may not be ready
    }

    entry.flushRAF = 0
  })
  entry.flushRAF = rafId
}

export function isTerminalFrozen(paneId: string): boolean {
  return entries.get(paneId)?.frozen ?? false
}

export function getTerminalEntry(
  paneId: string,
): TerminalEntry | undefined {
  return entries.get(paneId)
}

export function retainForMove(paneId: string): void {
  const entry = entries.get(paneId)
  if (!entry?.pty) return
  let serialized = ''
  try {
    serialized = entry.serializeAddon.serialize()
  } catch {
    // non-critical
  }
  retainedPanes.set(paneId, { pty: entry.pty, serialized })
}

export function isRetained(paneId: string): boolean {
  return retainedPanes.has(paneId)
}

export function consumeRetained(paneId: string): RetainedPane | undefined {
  const data = retainedPanes.get(paneId)
  retainedPanes.delete(paneId)
  return data
}
