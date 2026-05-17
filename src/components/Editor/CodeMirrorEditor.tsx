// Original: Muxy/Views/Editor/CodeEditorRepresentable.swift
// Description: CodeMirror 6 React wrapper. Takes pre-loaded content and creates EditorView.
//              Handles Cmd+S save, Cmd+F search toggle, modification tracking, cursor position.
// Status: 🚧 In progress

import { useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, crosshairCursor, highlightSpecialChars } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput, foldKeymap } from '@codemirror/language'
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { useMountEffect } from '../../hooks/useMountEffect'
import { getLanguageExtension } from '../../services/syntaxLanguageRegistry'
import { createEditorBaseTheme, createHighlightStyle } from './editorTheme'
import { useEditorStore } from '../../stores/editorStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { languageCompartment, themeCompartment, fontCompartment } from './editorCompartments'

interface CodeMirrorEditorProps {
  tabId: string
  filePath: string
  initialContent: string
  onModifiedChange?: (modified: boolean) => void
  onCursorChange?: (line: number, column: number) => void
}

export function CodeMirrorEditor({
  tabId,
  filePath,
  initialContent,
  onModifiedChange,
  onCursorChange,
}: CodeMirrorEditorProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastSavedDocRef = useRef<string>(initialContent)
  const tabIdRef = useRef(tabId)
  tabIdRef.current = tabId

  useMountEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ext = filePath.split('.').pop() ?? ''
    const langExt = getLanguageExtension(ext)
    const settings = useSettingsStore.getState()
    const baseTheme = createEditorBaseTheme()
    const highlightStyle = createHighlightStyle()
    const capturedTabId = tabIdRef.current

    const editorState = EditorState.create({
      doc: initialContent,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        search(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([
          ...defaultKeymap,
          ...searchKeymap.filter((k) => k.key !== 'Mod-f'),
          ...historyKeymap,
          ...foldKeymap,
          indentWithTab,
          {
            key: 'Mod-f',
            run: () => {
              const store = useEditorStore.getState()
              const meta = store.getEditor(capturedTabId)
              if (meta.searchVisible) {
                store.hideSearch(capturedTabId)
              } else {
                store.showSearch(capturedTabId)
              }
              return true
            },
          },
          {
            key: 'Mod-s',
            run: (view) => {
              const content = view.state.doc.toString()
              void window.electronAPI.editorFileWrite(filePath, content).then(() => {
                lastSavedDocRef.current = content
                onModifiedChange?.(false)
              })
              return true
            },
          },
        ]),
        languageCompartment.of(langExt ?? []),
        baseTheme,
        themeCompartment.of(highlightStyle),
        fontCompartment.of(EditorView.theme({
          '&': { fontSize: `${settings.editorFontSize}px` },
          '.cm-content': { fontFamily: `${settings.editorFontFamily}, monospace` },
          '.cm-gutters': { fontFamily: `${settings.editorFontFamily}, monospace` },
        })),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const isModified = update.state.doc.toString() !== lastSavedDocRef.current
            onModifiedChange?.(isModified)
          }
          if (update.selectionSet) {
            const pos = update.state.selection.main.head
            const line = update.state.doc.lineAt(pos)
            onCursorChange?.(line.number, pos - line.from + 1)
          }
        }),
      ],
    })

    const view = new EditorView({ state: editorState, parent: container })

    return () => {
      view.destroy()
    }
  })

  return (
    <div
      ref={containerRef}
      data-editor-tab={tabId}
      className="h-full w-full"
      onClick={(e) => e.stopPropagation()}
    />
  )
}
