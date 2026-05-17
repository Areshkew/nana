// Original: Muxy/Syntax/SyntaxTheme.swift + SyntaxScope.swift
// Description: Maps Ghostty palette colors (via CSS variables) to CodeMirror 6 HighlightStyle.
//              Base theme uses CSS var() references for automatic theme updates.
//              Syntax highlighting uses resolved colors (reconfigured via compartment).
// Status: 🚧 In progress

import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function createEditorBaseTheme(): Extension {
  return EditorView.theme({
    '&': {
      backgroundColor: 'var(--nana-bg)',
      color: 'var(--nana-fg)',
      height: '100%',
    },
    '.cm-content': {
      caretColor: 'var(--nana-fg)',
      fontFamily: 'var(--nana-font-mono, JetBrains Mono), monospace',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--nana-fg)',
      borderLeftWidth: '2px',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'var(--nana-accent-soft) !important',
    },
    '.cm-panels': {
      backgroundColor: 'var(--nana-surface)',
      color: 'var(--nana-fg)',
      borderBottom: '1px solid var(--nana-border)',
    },
    '.cm-panels input, .cm-panels button': {
      color: 'var(--nana-fg)',
    },
    '.cm-searchMatch': {
      backgroundColor: 'color-mix(in srgb, var(--nana-accent-soft) 50%, transparent)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'color-mix(in srgb, var(--nana-accent) 38%, transparent)',
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in srgb, var(--nana-surface) 40%, transparent)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--nana-surface)',
      color: 'var(--nana-fg-dim)',
      border: 'none',
      borderRight: '1px solid var(--nana-border)',
    },
    '.cm-foldGutter': {
      color: 'var(--nana-fg-dim)',
    },
    '.cm-foldGutter:hover': {
      color: 'var(--nana-fg-muted)',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '3em',
      textAlign: 'right',
      paddingRight: '8px',
    },
    '.cm-scroller': {
      overflow: 'auto',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'color-mix(in srgb, var(--nana-accent-soft) 38%, transparent)',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'var(--nana-fg)',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: 'color-mix(in srgb, var(--nana-accent) 30%, transparent) !important',
    },
  })
}

export function createHighlightStyle(): Extension {
  const accent = cssVar('--nana-accent') || '#89b4fa'
  const fg = cssVar('--nana-fg') || '#cdd6f4'
  const fgMuted = cssVar('--nana-fg-muted') || '#a6adc8'
  const fgDim = cssVar('--nana-fg-dim') || '#585b70'

  const highlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: accent },
    { tag: t.modifier, color: accent },
    { tag: [t.typeName, t.typeOperator], color: cssVar('--nana-fg') || '#f9e2af' },
    { tag: t.variableName, color: fg },
    { tag: t.special(t.variableName), color: fgMuted },
    { tag: t.function(t.variableName), color: accent },
    { tag: t.function(t.propertyName), color: accent },
    { tag: t.propertyName, color: fgMuted },
    { tag: t.string, color: '#a6e3a1' },
    { tag: t.special(t.string), color: '#f38ba8' },
    { tag: t.annotation, color: '#a6e3a1' },
    { tag: t.character, color: '#a6e3a1' },
    { tag: t.number, color: '#fab387' },
    { tag: t.bool, color: '#fab387' },
    { tag: t.null, color: '#fab387' },
    { tag: t.comment, color: fgDim, fontStyle: 'italic' },
    { tag: t.lineComment, color: fgDim, fontStyle: 'italic' },
    { tag: t.blockComment, color: fgDim, fontStyle: 'italic' },
    { tag: t.docComment, color: fgDim, fontStyle: 'italic' },
    { tag: t.meta, color: fgMuted },
    { tag: t.attributeValue, color: '#a6e3a1' },
    { tag: t.attributeName, color: fgMuted },
    { tag: t.tagName, color: accent },
    { tag: t.angleBracket, color: fgDim },
    { tag: t.operator, color: fgMuted },
    { tag: t.punctuation, color: fgDim },
    { tag: t.separator, color: fgDim },
    { tag: t.bracket, color: fgDim },
    { tag: t.regexp, color: '#f38ba8' },
    { tag: t.escape, color: '#f5e0dc' },
    { tag: t.definition(t.variableName), color: fg },
    { tag: t.local(t.variableName), color: fg },
    { tag: t.labelName, color: accent },
    { tag: t.constant(t.variableName), color: '#fab387' },
    { tag: t.heading, color: accent, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.link, color: accent, textDecoration: 'underline' },
    { tag: t.url, color: accent },
    { tag: t.processingInstruction, color: fgMuted },
    { tag: t.inserted, color: '#a6e3a1' },
    { tag: t.deleted, color: '#f38ba8' },
    { tag: t.changed, color: '#f9e2af' },
  ])

  return syntaxHighlighting(highlightStyle)
}
