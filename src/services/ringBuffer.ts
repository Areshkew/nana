// Original: N/A — performance infrastructure
// Description: Shared memory ring buffer for PTY data transfer within the renderer process
//              (between main thread and Web Worker). Uses Atomics for lock-free
//              synchronization. Note: SharedArrayBuffer cannot be shared across Electron's
//              IPC boundary, so this is used internally within the renderer for worker
//              communication only.
// Status: Completed

const HEADER_INTS = 4 // 4 x Int32 fields
const HEADER_BYTES = HEADER_INTS * 4
const DEFAULT_BUFFER_SIZE = 1024 * 1024

const WRITE_POS_IDX = 0
const READ_POS_IDX = 1
const DATA_LEN_IDX = 2
const CAPACITY_IDX = 3

export class RingBuffer {
  private buffer: SharedArrayBuffer
  private header: Int32Array
  private uint8: Uint8Array
  private capacity: number

  constructor(size: number = DEFAULT_BUFFER_SIZE) {
    this.capacity = size - HEADER_BYTES
    this.buffer = new SharedArrayBuffer(size)
    this.header = new Int32Array(this.buffer, 0, HEADER_INTS)
    this.uint8 = new Uint8Array(this.buffer)
    this.header[CAPACITY_IDX] = this.capacity
  }

  get sharedArrayBuffer(): SharedArrayBuffer {
    return this.buffer
  }

  write(data: Uint8Array): number {
    const writePos = Atomics.load(this.header, WRITE_POS_IDX)
    const currentLen = Atomics.load(this.header, DATA_LEN_IDX)

    const toWrite = Math.min(data.length, this.capacity - currentLen)
    if (toWrite === 0) return 0

    for (let i = 0; i < toWrite; i++) {
      this.uint8[HEADER_BYTES + ((writePos + i) % this.capacity)] = data[i]
    }

    Atomics.store(this.header, WRITE_POS_IDX, (writePos + toWrite) % this.capacity)
    Atomics.store(this.header, DATA_LEN_IDX, currentLen + toWrite)
    Atomics.notify(this.header, READ_POS_IDX, 1)

    return toWrite
  }

  read(maxBytes?: number): Uint8Array {
    const readPos = Atomics.load(this.header, READ_POS_IDX)
    const currentLen = Atomics.load(this.header, DATA_LEN_IDX)

    const toRead = maxBytes !== undefined ? Math.min(currentLen, maxBytes) : currentLen
    if (toRead === 0) return new Uint8Array(0)

    const result = new Uint8Array(toRead)
    for (let i = 0; i < toRead; i++) {
      result[i] = this.uint8[HEADER_BYTES + ((readPos + i) % this.capacity)]
    }

    Atomics.store(this.header, READ_POS_IDX, (readPos + toRead) % this.capacity)
    Atomics.store(this.header, DATA_LEN_IDX, currentLen - toRead)
    Atomics.notify(this.header, WRITE_POS_IDX, 1)

    return result
  }

  get availableRead(): number {
    return Atomics.load(this.header, DATA_LEN_IDX)
  }

  get availableWrite(): number {
    return this.capacity - Atomics.load(this.header, DATA_LEN_IDX)
  }

  destroy(): void {
    this.header = null as unknown as Int32Array
    this.uint8 = null as unknown as Uint8Array
  }
}
