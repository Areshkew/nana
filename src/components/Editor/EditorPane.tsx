// Original: Muxy/Views/Editor/EditorPane.swift
// Description: Top-level editor tab view — handles file loading lifecycle, then renders CodeMirror.
//              Shows breadcrumb, loading/error/large-file states.
// Status: 🚧 In progress

import { useState, useRef, useCallback } from 'react'
import { useMountEffect } from '../../hooks/useMountEffect'
import { useEditorStore, LARGE_FILE_WARNING_THRESHOLD, LARGE_FILE_REFUSE_THRESHOLD } from '../../stores/editorStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { CodeMirrorEditor } from './CodeMirrorEditor'
import { EditorBreadcrumb } from './EditorBreadcrumb'
import { EditorSearchBar } from './EditorSearchBar'

interface EditorPaneProps {
  tabId: string
  projectPath: string
  filePath: string
  onFocus: () => void
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; content: string }
  | { status: 'error'; message: string }
  | { status: 'largeFile'; size: number }

export function EditorPane({ tabId, projectPath, filePath, onFocus }: EditorPaneProps): JSX.Element {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const initRef = useRef(false)
  const setModified = useEditorStore((s) => s.setModified)
  const setCursor = useEditorStore((s) => s.setCursor)
  const searchVisible = useEditorStore((s) => s.getEditor(tabId).searchVisible)

  const loadFile = useCallback(async (forceOpen = false): Promise<void> => {
    setLoadState({ status: 'loading' })
    try {
      const stat = await window.electronAPI.editorFileStat(filePath)
      if (stat.isDirectory) {
        setLoadState({ status: 'error', message: 'Cannot open a directory.' })
        return
      }
      if (stat.size > LARGE_FILE_REFUSE_THRESHOLD) {
        setLoadState({ status: 'error', message: `File is ${(stat.size / 1024 / 1024).toFixed(1)} MB — too large to open (max 50 MB).` })
        return
      }
      if (!forceOpen && stat.size > LARGE_FILE_WARNING_THRESHOLD) {
        setLoadState({ status: 'largeFile', size: stat.size })
        return
      }
      const content = await window.electronAPI.editorFileRead(filePath)
      setLoadState({ status: 'ready', content })
    } catch (err) {
      setLoadState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load file.' })
    }
  }, [filePath])

  useMountEffect(() => {
    if (!initRef.current) {
      initRef.current = true
      useEditorStore.getState().initEditor(tabId)
      void loadFile()
    }
    return () => {
      useEditorStore.getState().removeEditor(tabId)
    }
  })

  if (loadState.status === 'error') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--nana-bg)]" onClick={onFocus}>
        <svg width="32" height="32" viewBox="0 0 16 16" fill="var(--nana-fg-dim)">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z" />
        </svg>
        <span className="max-w-md text-center text-sm text-[var(--nana-fg-dim)]">{loadState.message}</span>
      </div>
    )
  }

  if (loadState.status === 'largeFile') {
    const sizeMB = (loadState.size / 1024 / 1024).toFixed(1)
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--nana-bg)]" onClick={onFocus}>
        <svg width="32" height="32" viewBox="0 0 16 16" fill="var(--nana-fg-dim)">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z" />
        </svg>
        <div className="text-center text-sm text-[var(--nana-fg-muted)]">
          This file is {sizeMB} MB. Large files may be slow to edit.
        </div>
        <div className="flex gap-2">
          <button
            className="rounded px-3 py-1 text-sm"
            style={{ background: 'var(--nana-surface)', color: 'var(--nana-fg)', border: '1px solid var(--nana-border)' }}
            onClick={() => void loadFile(true)}
          >
            Open Anyway
          </button>
          <button
            className="rounded px-3 py-1 text-sm"
            style={{ background: 'var(--nana-surface)', color: 'var(--nana-fg-dim)', border: '1px solid var(--nana-border)' }}
            onClick={() => setLoadState({ status: 'error', message: 'File not opened.' })}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (loadState.status === 'loading') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--nana-bg)]" onClick={onFocus}>
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--nana-fg-dim)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-[var(--nana-bg)]" onClick={onFocus}>
      <EditorBreadcrumb filePath={filePath} projectPath={projectPath} tabId={tabId} />
      {searchVisible && <EditorSearchBar tabId={tabId} />}
      <div className="min-h-0 flex-1 overflow-hidden">
        <CodeMirrorEditor
          tabId={tabId}
          filePath={filePath}
          initialContent={loadState.content}
          onModifiedChange={(m) => {
            setModified(tabId, m)
            if (m) useWorkspaceStore.getState().pinTab(tabId)
          }}
          onCursorChange={(l, c) => setCursor(tabId, l, c)}
        />
      </div>
    </div>
  )
}
