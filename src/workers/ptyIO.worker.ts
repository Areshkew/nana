// Original: N/A — performance infrastructure
// Description: Web Worker for PTY data processing. Receives raw PTY data,
//              decodes UTF-8, and forwards to the main thread. Keeps heavy
//              string processing off the renderer's main thread.
// Status: Completed

interface WorkerInMessage {
  type: 'pty-data' | 'pty-data-string' | 'init-transport' | 'stop-transport' | 'ping'
  paneId: string
  buffer?: SharedArrayBuffer
  data?: string
}

interface WorkerOutMessage {
  type: 'decoded-data' | 'transport-active' | 'pong'
  paneId: string
  data?: string
}

const decoders = new Map<string, TextDecoder>()
const stopFlags = new Map<string, boolean>()
const reusableBuffers = new Map<string, Uint8Array>()

function getDecoder(paneId: string): TextDecoder {
  let dec = decoders.get(paneId)
  if (!dec) {
    dec = new TextDecoder('utf-8', { fatal: false })
    decoders.set(paneId, dec)
  }
  return dec
}

function startPolling(paneId: string, buffer: SharedArrayBuffer): void {
  const header = new Int32Array(buffer, 0, 4)
  const uint8 = new Uint8Array(buffer)
  const CAPACITY_IDX = 3
  const READ_POS_IDX = 1
  const DATA_LEN_IDX = 2
  const HEADER_BYTES = 16

  stopFlags.set(paneId, false)

  function getBuffer(len: number): Uint8Array {
    const existing = reusableBuffers.get(paneId)
    if (existing && existing.length >= len) {
      return existing
    }
    const buf = new Uint8Array(len)
    reusableBuffers.set(paneId, buf)
    return buf
  }

  function poll(): void {
    if (stopFlags.get(paneId)) return

      const len = Atomics.load(header, DATA_LEN_IDX)
    if (len > 0) {
      const readPos = Atomics.load(header, READ_POS_IDX)
      const capacity = Atomics.load(header, CAPACITY_IDX)
      const bytes = getBuffer(len)

      for (let i = 0; i < len; i++) {
        bytes[i] = uint8[HEADER_BYTES + ((readPos + i) % capacity)]
      }

      const newReadPos = (readPos + len) % capacity
      Atomics.store(header, READ_POS_IDX, newReadPos)
      Atomics.store(header, DATA_LEN_IDX, 0)
      Atomics.notify(header, READ_POS_IDX, 1)

      const decoder = getDecoder(paneId)
      const text = decoder.decode(bytes, { stream: true })
      if (text.length > 0) {
        const msg: WorkerOutMessage = { type: 'decoded-data', paneId, data: text }
        self.postMessage(msg)
      }
    }

    if (!stopFlags.get(paneId)) {
      setTimeout(poll, 1)
    }
  }

  poll()
}

self.onmessage = (e: MessageEvent<WorkerInMessage>): void => {
  const msg = e.data

  switch (msg.type) {
    case 'pty-data': {
      if (!msg.buffer) break
      const bytes = new Uint8Array(msg.buffer)
      if (bytes.length === 0) break
      const decoder = getDecoder(msg.paneId)
      const text = decoder.decode(bytes, { stream: true })
      if (text.length > 0) {
        const outMsg: WorkerOutMessage = { type: 'decoded-data', paneId: msg.paneId, data: text }
        self.postMessage(outMsg)
      }
      break
    }

    case 'pty-data-string': {
      if (msg.data && msg.data.length > 0) {
        const outMsg: WorkerOutMessage = { type: 'decoded-data', paneId: msg.paneId, data: msg.data }
        self.postMessage(outMsg)
      }
      break
    }

    case 'init-transport': {
      if (msg.buffer) {
        startPolling(msg.paneId, msg.buffer)
        const ackMsg: WorkerOutMessage = { type: 'transport-active', paneId: msg.paneId }
        self.postMessage(ackMsg)
      }
      break
    }

    case 'stop-transport': {
      stopFlags.set(msg.paneId, true)
      decoders.delete(msg.paneId)
      reusableBuffers.delete(msg.paneId)
      break
    }

    case 'ping': {
      self.postMessage({ type: 'pong' })
      break
    }
  }
}
