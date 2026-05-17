// Original: Muxy/Services/GhosttyService.swift
// Description: Main-process PTY management via node-pty, exposed through IPC.
//              Forwards process exit events to the renderer.
// Status: ✅ Completed

import { ipcMain, webContents, type IpcMainInvokeEvent } from 'electron'
import type { IPty } from 'node-pty'
import os from 'os'
import fs from 'fs'

let ptyModule: typeof import('node-pty') | null = null

async function getPty(): Promise<typeof import('node-pty')> {
  ptyModule ??= await import('node-pty')
  return ptyModule
}

const ptys = new Map<string, IPty>()
const ptyConfigs = new Map<string, { cwd: string; cols: number; rows: number; wcId: number }>()
const webContentsToPaneIds = new Map<number, Set<string>>()
const deadWcIds = new Set<number>()

function getDefaultShell(): string {
  if (process.platform === 'win32') {
    return 'powershell.exe'
  }
  return process.env.SHELL ?? 'bash'
}

function validatePaneId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Invalid pty pane ID')
  }
}

function validateString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${name}: expected string`)
  }
}

function validateNumber(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid ${name}: expected number`)
  }
}

function sendToRenderer(wcId: number, channel: string, ...args: unknown[]): void {
  if (deadWcIds.has(wcId)) return
  try {
    const wc = webContents.fromId(wcId)
    if (wc && !wc.isDestroyed()) {
      wc.send(channel, ...args)
    }
  } catch {
    // WebContents already destroyed
  }
}

function cleanupPty(paneId: string): void {
  const proc = ptys.get(paneId)
  if (proc) {
    proc.kill()
    ptys.delete(paneId)
  }
  ptyConfigs.delete(paneId)
  webContentsToPaneIds.forEach((paneIds) => paneIds.delete(paneId))
}

function killAllPtys(): void {
  webContentsToPaneIds.forEach((_paneIds, wcId) => deadWcIds.add(wcId))
  for (const proc of ptys.values()) {
    proc.kill()
  }
  ptys.clear()
  ptyConfigs.clear()
  webContentsToPaneIds.clear()
}

async function ensurePty(paneId: string): Promise<IPty | null> {
  const existing = ptys.get(paneId)
  if (existing) return existing

  const config = ptyConfigs.get(paneId)
  if (!config) return null

  // PTY died unexpectedly (common on Windows conpty after TUI exit).
  // Recreate it automatically using the stored config.
  console.log(`[PTY RECREATE ${paneId}]`)
  const nodePty = await getPty()
  const shell = getDefaultShell()

  const proc = nodePty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: config.cols,
    rows: config.rows,
    cwd: config.cwd,
    env: {
      ...process.env,
      NANA_PANE_ID: paneId,
    },
    useConpty: true,
    conptyInheritCursor: true,
  })

  const wcId = config.wcId

  proc.onData((data: string) => {
    try {
      sendToRenderer(wcId, 'pty:data', paneId, data)
    } catch {
      // Renderer may have been destroyed
    }
    if (deadWcIds.has(wcId)) {
      cleanupPty(paneId)
    }
  })

  proc.onExit(() => {
    ptys.delete(paneId)
    const paneIds = webContentsToPaneIds.get(wcId)
    paneIds?.delete(paneId)
    sendToRenderer(wcId, 'pty:exit', paneId)
  })

  ptys.set(paneId, proc)

  let paneIds = webContentsToPaneIds.get(wcId)
  if (!paneIds) {
    paneIds = new Set()
    webContentsToPaneIds.set(wcId, paneIds)
  }
  paneIds.add(paneId)

  // Notify renderer that PTY is back
  sendToRenderer(wcId, 'pty:data', paneId, '\r\n')

  return proc
}

export function registerPtyHandlers(): void {
  ipcMain.handle(
    'pty:create',
    async (event: IpcMainInvokeEvent, paneId: string, cols: number, rows: number, cwd?: string) => {
      validatePaneId(paneId)
      validateNumber(cols, 'cols')
      validateNumber(rows, 'rows')

      const existing = ptys.get(paneId)
      if (existing) {
        return existing.pid
      }

      const nodePty = await getPty()
      const shell = getDefaultShell()

      let effectiveCwd = cwd ?? os.homedir()
      try {
        const stat = fs.statSync(effectiveCwd)
        if (!stat.isDirectory()) effectiveCwd = os.homedir()
      } catch {
        effectiveCwd = os.homedir()
      }

      const proc = nodePty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: effectiveCwd,
        env: {
          ...process.env,
          NANA_PANE_ID: paneId,
        },
        useConpty: true,
        conptyInheritCursor: true,
      })

      const wcId = event.sender.id

      proc.onData((data: string) => {
        try {
          sendToRenderer(wcId, 'pty:data', paneId, data)
        } catch {
          // Renderer may have been destroyed
        }
        if (deadWcIds.has(wcId)) {
          cleanupPty(paneId)
        }
      })

      proc.onExit(() => {
        ptys.delete(paneId)
        const paneIds = webContentsToPaneIds.get(wcId)
        paneIds?.delete(paneId)
        sendToRenderer(wcId, 'pty:exit', paneId)
      })

      ptyConfigs.set(paneId, { cwd: effectiveCwd, cols, rows, wcId })
      ptys.set(paneId, proc)

      let paneIds = webContentsToPaneIds.get(wcId)
      if (!paneIds) {
        paneIds = new Set()
        webContentsToPaneIds.set(wcId, paneIds)
      }
      paneIds.add(paneId)

      return proc.pid
    },
  )

  ipcMain.handle(
    'pty:write',
    async (_event: IpcMainInvokeEvent, paneId: string, data: string) => {
      validatePaneId(paneId)
      validateString(data, 'data')
      const proc = await ensurePty(paneId)
      if (!proc) {
        console.log(`[PTY WRITE ${paneId}] no proc found`)
        return
      }
      try {
        proc.write(data)
      } catch (err) {
        console.log(`[PTY WRITE ${paneId}] error:`, err)
      }
    },
  )

  ipcMain.handle(
    'pty:resize',
    async (_event: IpcMainInvokeEvent, paneId: string, cols: number, rows: number) => {
      validatePaneId(paneId)
      validateNumber(cols, 'cols')
      validateNumber(rows, 'rows')
      // Update stored dimensions so recreated PTY uses them
      const config = ptyConfigs.get(paneId)
      if (config) {
        config.cols = cols
        config.rows = rows
      }
      const proc = await ensurePty(paneId)
      if (!proc) return
      try {
        proc.resize(cols, rows)
      } catch {
        // PTY may have already exited
      }
    },
  )

  ipcMain.handle(
    'pty:kill',
    (_event: IpcMainInvokeEvent, paneId: string) => {
      validatePaneId(paneId)
      cleanupPty(paneId)
    },
  )

  ipcMain.handle(
    'pty:isProcessRunning',
    (_event: IpcMainInvokeEvent, paneId: string) => {
      validatePaneId(paneId)
      const proc = ptys.get(paneId)
      if (!proc) return false
      try {
        process.kill(proc.pid, 0)
        return true
      } catch {
        return false
      }
    },
  )

  ipcMain.on('pty:killAll', () => {
    killAllPtys()
  })
}
