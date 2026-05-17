// Original: N/A — project infrastructure
// Description: Tracks the most recently mounted xterm.js Terminal instance so
// custom modals and other UI actions can restore focus afterwards.
// Status: ✅ Completed

import { Terminal } from 'xterm'

let activeTerminal: Terminal | null = null

export function registerActiveTerminal(term: Terminal): void {
  activeTerminal = term
}

export function unregisterActiveTerminal(term: Terminal): void {
  if (activeTerminal === term) {
    activeTerminal = null
  }
}

export function focusActiveTerminal(): void {
  activeTerminal?.focus()
}
