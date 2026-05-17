// Original: N/A — performance infrastructure
// Description: Manager for the PTY I/O Web Worker. Handles worker lifecycle,
//              SharedArrayBuffer transport setup, and data routing to terminals.
// Status: Completed

interface WorkerOutMessage {
  type: string
  paneId: string
  data?: string
}

let worker: Worker | null = null
const pendingBuffer: { paneId: string; data: string }[] = []
let dataHandler: ((paneId: string, data: string) => void) | null = null

function getWorker(): Worker {
  if (worker) return worker

  worker = new Worker(new URL('../workers/ptyIO.worker.ts', import.meta.url), {
    type: 'module',
  })

  worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
    const msg = e.data
    if (msg.type === 'decoded-data' && dataHandler) {
      dataHandler(msg.paneId, msg.data ?? '')
    }
  }

  worker.onerror = (err) => {
    console.error('PTY I/O Worker error:', err)
    worker = null
  }

  for (const item of pendingBuffer) {
    dataHandler?.(item.paneId, item.data)
  }
  pendingBuffer.length = 0

  return worker
}

export function initPtyWorker(): void {
  getWorker()
}

export function setupSharedTransport(
  paneId: string,
  buffer: SharedArrayBuffer,
): void {
  const w = getWorker()
  w.postMessage({ type: 'init-transport', paneId, buffer }, [buffer])
}

export function teardownSharedTransport(paneId: string): void {
  const w = getWorker()
  w.postMessage({ type: 'stop-transport', paneId })
}

export function setPtyDataHandler(handler: (paneId: string, data: string) => void): void {
  dataHandler = handler
}

export function routePtyData(paneId: string, data: string): void {
  if (dataHandler) {
    dataHandler(paneId, data)
  } else {
    pendingBuffer.push({ paneId, data })
  }
}

export function terminatePtyWorker(): void {
  if (worker) {
    worker.terminate()
    worker = null
  }
  pendingBuffer.length = 0
}
