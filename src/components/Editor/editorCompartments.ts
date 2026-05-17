// Original: N/A — helper module for CodeMirror compartment reconfiguration
// Description: Utility functions to reconfigure language, theme, and font compartments
//              in an existing CodeMirror EditorView.
// Status: 🚧 In progress

import { Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { getLanguageExtension } from '../../services/syntaxLanguageRegistry'
import { createHighlightStyle } from './editorTheme'
import { useSettingsStore } from '../../stores/settingsStore'
import { useThemeStore } from '../../stores/themeStore'

export const languageCompartment = new Compartment()
export const themeCompartment = new Compartment()
export const fontCompartment = new Compartment()

function reconfigureAllEditorViews(fn: (view: EditorView) => void): void {
  const editors = document.querySelectorAll<HTMLElement>('.cm-editor')
  for (const el of editors) {
    const view = EditorView.findFromDOM(el)
    if (view) fn(view)
  }
}

useThemeStore.subscribe((state, prev) => {
  if (state.currentThemeName !== prev.currentThemeName) {
    reconfigureAllEditorViews(reconfigureTheme)
  }
})

useSettingsStore.subscribe((state, prev) => {
  if (state.editorFontFamily !== prev.editorFontFamily || state.editorFontSize !== prev.editorFontSize) {
    reconfigureAllEditorViews(reconfigureFont)
  }
})

export function reconfigureLanguage(view: EditorView, ext: string): void {
  const langExt = getLanguageExtension(ext)
  view.dispatch({ effects: languageCompartment.reconfigure(langExt ?? []) })
}

export function reconfigureTheme(view: EditorView): void {
  view.dispatch({ effects: themeCompartment.reconfigure(createHighlightStyle()) })
}

export function reconfigureFont(view: EditorView): void {
  const settings = useSettingsStore.getState()
  view.dispatch({
    effects: fontCompartment.reconfigure(EditorView.theme({
      '&': { fontSize: `${settings.editorFontSize}px` },
      '.cm-content': { fontFamily: `${settings.editorFontFamily}, monospace` },
      '.cm-gutters': { fontFamily: `${settings.editorFontFamily}, monospace` },
    })),
  })
}
