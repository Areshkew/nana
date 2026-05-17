// Original: Muxy/Views/Terminal/GhosttyTerminalNSView.swift
// Description: xterm.js React wrapper with GPU rendering, PTY batching, freeze/resume,
//              serialize-on-hide, and scrollback persistence for aggressive optimization.
// Status: ✅ Completed

import { useRef, forwardRef, useImperativeHandle } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { WebglAddon } from 'xterm-addon-webgl'
import { SerializeAddon } from '@xterm/addon-serialize'
import { ClipboardAddon } from '@xterm/addon-clipboard'
import 'xterm/css/xterm.css'
import { useMountEffect } from '../../hooks/useMountEffect'
import { useThemeSync, fallbackTheme } from '../../hooks/useThemeSync'
import { createPty } from '../../services/ptyService'
import {
  registerActiveTerminal,
  unregisterActiveTerminal,
} from '../../services/terminalFocus'
import {
  registerTerminalLifecycle,
  unregisterTerminalLifecycle,
  setTerminalLifecyclePty,
  queueTerminalData,
  getTerminalEntry,
  isRetained,
  consumeRetained,
} from '../../services/terminalLifecycle'
import type { PtySession } from '../../services/ptyService'
import { scrollbackStore } from '../../services/terminalScrollback'
import { useTerminalSearchStore } from '../../stores/terminalSearchStore'
import { useSettingsStore } from '../../stores/settingsStore'

const MAX_SCROLLBACK = 10000

const mountedPaneIds = new Set<string>()

export interface XTermSurfaceHandle {
  focus: () => void
  searchNext: (needle: string) => boolean
  searchPrevious: (needle: string) => boolean
  clearSearch: () => void
}

interface XTermSurfaceProps {
  paneId: string
  cwd?: string
  focused?: boolean
  visible?: boolean
  startupCommand?: string
  onTitleChange?: (title: string) => void
  onProcessExit?: () => void
}

export const XTermSurface = forwardRef<XTermSurfaceHandle, XTermSurfaceProps>(function XTermSurface({
  paneId,
  cwd,
  startupCommand,
  onTitleChange,
  onProcessExit,
}, ref): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const ptyRef = useRef<Awaited<ReturnType<typeof createPty>> | null>(null)
  const glAddonRef = useRef<WebglAddon | null>(null)
  const serializeAddonRef = useRef<SerializeAddon | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const searchAddonRef = useRef<SearchAddon | null>(null)

  const themeSyncRefs = useRef({
    fitAddonRef,
    ptyRef,
  })

  useThemeSync(terminalRef, themeSyncRefs.current)

  useMountEffect(() => {
    if (!containerRef.current) return

    let disposed = false

    const term = new Terminal({
      fontFamily: `${useSettingsStore.getState().editorFontFamily}, monospace`,
      fontSize: useSettingsStore.getState().editorFontSize,
      theme: fallbackTheme,
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: MAX_SCROLLBACK,
    })

    const fitAddon = new FitAddon()
    const searchAddon = new SearchAddon()
    const serializeAddon = new SerializeAddon()
    const glAddon = new WebglAddon()

    glAddon.onContextLoss(() => {
      if (!disposed) {
        glAddon.dispose()
        glAddonRef.current = null
      }
    })

    term.loadAddon(fitAddon)
    term.loadAddon(searchAddon)
    term.loadAddon(new WebLinksAddon())
    term.loadAddon(new ClipboardAddon())
    term.loadAddon(serializeAddon)
    term.loadAddon(glAddon)

    fitAddonRef.current = fitAddon
    searchAddonRef.current = searchAddon
    glAddonRef.current = glAddon
    serializeAddonRef.current = serializeAddon

    const resultDisposable = searchAddon.onDidChangeResults((result) => {
      if (!disposed) {
        useTerminalSearchStore.getState().setSearchResult(
          paneId,
          result.resultCount,
          result.resultIndex + 1,
        )
      }
    })

    term.open(containerRef.current)

    try {
      fitAddon.fit()
    } catch {
      // Container may have zero dimensions during initial mount
    }

    // Restore scrollback from IndexedDB only on initial mount this session
    const isFirstMount = !mountedPaneIds.has(paneId)
    mountedPaneIds.add(paneId)

    if (isFirstMount) {
      void scrollbackStore.load(paneId).then((serialized) => {
        if (!serialized || disposed) return
        try {
          term.clear()
          term.write(serialized, () => {
            if (!disposed) {
              term.scrollToBottom()
            }
          })
          // Clear saved state so it doesn't stack on next restore
          void scrollbackStore.remove(paneId)
        } catch {
          // Non-critical — start fresh
        }
      })
    }

    registerActiveTerminal(term)
    registerTerminalLifecycle(paneId, term, fitAddon, serializeAddon)

    let unsubscribePtyData: (() => void) | null = null
    let dataDisposable: { dispose(): void } | null = null

    function attachPty(pty: PtySession): void {
      if (disposed) return
      ptyRef.current = pty
      setTerminalLifecyclePty(paneId, pty)

      unsubscribePtyData = pty.onData((data: string) => {
        if (disposed) return
        queueTerminalData(paneId, data)
      })

      dataDisposable = term.onData((data: string) => {
        if (disposed) return
        pty.write(data)
      })

      if (onProcessExit) {
        pty.onExit(() => onProcessExit())
      }
    }

    const retained = consumeRetained(paneId)
    if (retained) {
      attachPty(retained.pty)
      if (retained.serialized) {
        term.write(retained.serialized)
      }
    } else {
      void createPty(paneId, term.cols, term.rows, cwd).then((pty) => {
        if (disposed) {
          pty.kill()
          return
        }
        attachPty(pty)

        if (startupCommand) {
          pty.write(startupCommand + '\r')
        }
      })
    }

    // Custom key handler: route app shortcuts to DOM, terminal keys to xterm.js
    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
        const isMac = navigator.platform.toLowerCase().includes('mac')
        const cmd = isMac ? event.metaKey : event.ctrlKey
        const alt = event.altKey
        const shift = event.shiftKey
        const key = event.key.toLowerCase()

        // Cmd/Ctrl+Shift+C: copy selection via Electron clipboard (IPC)
        if (cmd && shift && !alt && key === 'c') {
          const selection = term.getSelection()
          if (selection) {
            void window.electronAPI.clipboardWriteText(selection)
            return false
          }
        }

        // Cmd/Ctrl + Alt combinations: let terminal handle them (e.g. Cmd+Alt+Arrow for pane nav)
        if (cmd && alt) {
          return true
        }

        // App shortcuts using primary modifier: prevent xterm.js from consuming them
        if (cmd && !alt) {
          // These app shortcuts must propagate to DOM, not terminal
          const appShortcutKeys = new Set([
            'f',        // findInTerminal
            'p',        // quickOpen
            ',',        // open settings
            'b',        // toggle sidebar
            't',        // new tab
            'w',        // close tab
            'd',        // split right
            'k',        // VCS tab
            'o',        // open project
            'e',        // file tree toggle
            'l',        // AI usage toggle
            's',        // save (editor)
            '[',        // previous tab
            ']',        // next tab
            '1', '2', '3', '4', '5', '6', '7', '8', '9',
          ])

          if (shift) {
            const shiftShortcutKeys = new Set([
              'd',       // split down
              'w',       // close pane
              't',       // rename tab
              'p',       // pin/unpin tab
              'o',       // switch worktree
              'k',       // theme picker
              'r',       // reload config
              'c',       // copy selection (already handled above)
            ])
            if (shiftShortcutKeys.has(key)) return false
          } else {
            if (appShortcutKeys.has(key)) return false
          }

          // Ctrl+Shift (non-Mac) combos should go to terminal
          if (!isMac && shift) return true
        }

        // Alt alone: let terminal handle it (Alt+Backspace = word delete, Alt+. = last arg, etc.)
        if (alt && !cmd) return true

        // Everything else: let terminal process it
        return true
      })

    const titleDisposable = term.onTitleChange((title: string) => {
      if (!disposed) {
        onTitleChange?.(title)
      }
    })

    // Resize debounced with requestAnimationFrame.
    // Always resize, even during alternate buffer (TUI) mode,
    // so child processes receive SIGWINCH and reflow properly.
    let resizeRAF = 0
    const handleResize = (): void => {
      if (disposed) return
      cancelAnimationFrame(resizeRAF)
      resizeRAF = requestAnimationFrame(() => {
        if (disposed) return
        const entry = getTerminalEntry(paneId)
        if (entry?.frozen) return
        const prevCols = term.cols
        const prevRows = term.rows
        try {
          fitAddon.fit()
        } catch {
          return
        }
        if (term.cols !== prevCols || term.rows !== prevRows) {
          ptyRef.current?.resize(term.cols, term.rows)
        }
      })
    }

    // Watch for buffer changes to restore cursor visibility and focus
    // when a TUI exits on Windows conpty.
    let wasAlternate = false
    const bufferChangeDisposable = (term as unknown as {
      buffer: { onBufferChange: (cb: () => void) => { dispose(): void } }
    }).buffer.onBufferChange(() => {
      const isAlternate = term.buffer.active.type === 'alternate'
      if (wasAlternate && !isAlternate) {
        // TUI just exited — on Windows conpty the shell prompt sometimes
        // does not redraw and focus is stolen. Force a fresh prompt and
        // aggressively restore xterm.js focus.
        setTimeout(() => {
          if (disposed) return
          // Force a fresh prompt line
          ptyRef.current?.write('\r\n')
          // Aggressively restore focus: blur any other focused element,
          // focus the container, then focus xterm.js's internal textarea
          const previouslyFocused = document.activeElement as HTMLElement | null
          if (previouslyFocused && previouslyFocused !== containerRef.current) {
            previouslyFocused.blur()
          }
          containerRef.current?.focus({ preventScroll: true })
          term.focus()
          const textarea = containerRef.current?.querySelector(
            '.xterm-helper-textarea',
          ) as HTMLTextAreaElement | null
          textarea?.focus({ preventScroll: true })
          term.scrollToBottom()
        }, 200)
      }
      wasAlternate = isAlternate
    })
    window.addEventListener('resize', handleResize)

    const ro = new ResizeObserver(() => {
      handleResize()
    })
    ro.observe(containerRef.current)

    // Periodic scrollback persistence (every 30s while visible)
    const persistInterval = setInterval(() => {
      if (disposed) return
      const entry = getTerminalEntry(paneId)
      if (!entry || entry.frozen) return
      void scrollbackStore.save(term, serializeAddon, paneId)
    }, 30_000)

    terminalRef.current = term

    return () => {
      disposed = true
      cancelAnimationFrame(resizeRAF)
      clearInterval(persistInterval)
      window.removeEventListener('resize', handleResize)
      ro.disconnect()
      titleDisposable.dispose()
      resultDisposable.dispose()
      bufferChangeDisposable.dispose()
      if (unsubscribePtyData) {
        unsubscribePtyData()
      }
      if (dataDisposable) {
        dataDisposable.dispose()
      }
      unregisterActiveTerminal(term)
      unregisterTerminalLifecycle(paneId)

      // Persist final state before disposal
      if (serializeAddonRef.current && terminalRef.current) {
        void scrollbackStore.save(terminalRef.current, serializeAddonRef.current, paneId)
      }

      // Dispose WebGL addon FIRST — it accesses RenderService internals
      // that become invalid after term.dispose()
      if (glAddonRef.current) {
        glAddonRef.current.dispose()
        glAddonRef.current = null
      }

      if (ptyRef.current) {
        if (!isRetained(paneId)) {
          ptyRef.current.kill()
        }
        ptyRef.current = null
      }
      searchAddonRef.current = null
      serializeAddonRef.current = null
      fitAddonRef.current = null
      term.dispose()
      terminalRef.current = null
    }
  })

  const lastSearchNeedleRef = useRef('')

  const getSearchDecorations = () => {
    const style = getComputedStyle(document.documentElement)
    return {
      matchBackground: style.getPropertyValue('--nana-border').trim().replace('#', '') + '40' || '#58585840',
      matchBorder: style.getPropertyValue('--nana-border').trim() || '#585858',
      matchOverviewRuler: style.getPropertyValue('--nana-fg-muted').trim() || '#8b949e',
      activeMatchBackground: style.getPropertyValue('--nana-accent').trim() + '66' || '#58a6ff66',
      activeMatchBorder: style.getPropertyValue('--nana-accent').trim() || '#58a6ff',
      activeMatchColorOverviewRuler: style.getPropertyValue('--nana-accent').trim() || '#58a6ff',
    }
  }

  useImperativeHandle(ref, () => ({
    focus: () => {
      terminalRef.current?.focus()
    },
    searchNext: (needle: string) => {
      if (!searchAddonRef.current) return false
      lastSearchNeedleRef.current = needle
      return searchAddonRef.current.findNext(needle, {
        decorations: getSearchDecorations(),
      })
    },
    searchPrevious: (needle: string) => {
      if (!searchAddonRef.current) return false
      lastSearchNeedleRef.current = needle
      return searchAddonRef.current.findPrevious(needle, {
        decorations: getSearchDecorations(),
      })
    },
    clearSearch: () => {
      lastSearchNeedleRef.current = ''
      searchAddonRef.current?.clearDecorations()
    },
  }))

  return (
    <div
      ref={containerRef}
      data-pane-id={paneId}
      style={{ padding: '8px 0px 8px 8px', width: '100%', height: '100%' }}
    />
  )
})
