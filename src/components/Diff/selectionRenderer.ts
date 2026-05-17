// Original: xterm.js/src/browser/renderer/shared/SelectionRenderModel.ts
// Description: Canvas rendering helpers for diff text selection highlights.
//              Draws selection background rects and splits text into segments
//              (before / selected / after) for per-line rendering.
// Status: Completed

import type { NanaThemeSnapshot } from '../../theme/nanaTheme'
import type { SelectionRange } from './selectionModel'

export interface LineSelectionRange {
  startCol: number
  endCol: number
}

export function getLineSelectionRange(
  rowIndex: number,
  selection: SelectionRange | null,
): LineSelectionRange | null {
  if (!selection) return null
  if (rowIndex < selection.start.row || rowIndex > selection.end.row) return null

  const startCol = rowIndex === selection.start.row ? selection.start.col : 0
  const endCol = rowIndex === selection.end.row ? selection.end.col : Infinity
  return { startCol, endCol }
}

const FONT = '12px "JetBrains Mono", "Cascadia Code", "Fira Code", monospace'

export function drawContentWithSelection(
  ctx: CanvasRenderingContext2D,
  text: string,
  contentY: number,
  contentX: number,
  _contentWidth: number,
  theme: NanaThemeSnapshot,
  charWidth: number,
  lineHeight: number,
  lineSel: LineSelectionRange | null,
): void {
  const yText = contentY - 2
  ctx.font = FONT
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'left'

  // No selection on this line — single text draw
  if (!lineSel) {
    ctx.fillStyle = theme.fg
    ctx.fillText(text, contentX, yText)
    return
  }

  const { startCol, endCol } = lineSel
  const selStart = Math.max(0, Math.min(startCol, text.length))
  const selEnd = Math.max(0, Math.min(endCol, text.length))

  // Draw selection background
  if (selStart < selEnd) {
    const selX = contentX + selStart * charWidth
    const selW = (selEnd - selStart) * charWidth
    ctx.fillStyle = theme.selectionBg
    ctx.fillRect(selX, contentY - lineHeight, selW, lineHeight)
  }

  // Segment 1: before selection
  if (selStart > 0) {
    ctx.fillStyle = theme.fg
    ctx.fillText(text.slice(0, selStart), contentX, yText)
  }

  // Segment 2: selected text
  if (selStart < selEnd) {
    const selX = contentX + selStart * charWidth
    ctx.fillStyle = theme.fg
    ctx.fillText(text.slice(selStart, selEnd), selX, yText)
  }

  // Segment 3: after selection
  if (selEnd < text.length) {
    const afterX = contentX + selEnd * charWidth
    ctx.fillStyle = theme.fg
    ctx.fillText(text.slice(selEnd), afterX, yText)
  }
}
