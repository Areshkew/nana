// Original: xterm.js/src/browser/selection/SelectionModel.ts + SelectionService.ts
// Description: Pure selection state model for canvas-based diff text selection.
//              Stores anchor/focus coordinates, computes ordered ranges, handles
//              word/line/select-all modes. Zero DOM dependencies.
// Status: Completed

export interface TextPoint {
  row: number
  col: number
}

export interface SelectionRange {
  start: TextPoint
  end: TextPoint
}

export class SelectionModel {
  public anchor: TextPoint | null = null
  public focus: TextPoint | null = null
  public mode: 'normal' | 'word' | 'line' = 'normal'

  public clear(): void {
    this.anchor = null
    this.focus = null
    this.mode = 'normal'
  }

  public get hasSelection(): boolean {
    const range = this.orderedRange
    if (!range) return false
    return range.start.row !== range.end.row || range.start.col !== range.end.col
  }

  public get orderedRange(): SelectionRange | null {
    if (!this.anchor) return null
    const end = this.focus ?? this.anchor

    if (
      this.anchor.row < end.row ||
      (this.anchor.row === end.row && this.anchor.col <= end.col)
    ) {
      return { start: this.anchor, end }
    }
    return { start: end, end: this.anchor }
  }

  public setAnchor(point: TextPoint): void {
    this.anchor = point
    this.focus = null
    this.mode = 'normal'
  }

  public setFocus(point: TextPoint): void {
    this.focus = point
  }

  public selectAll(lastRow: number, lastCol: number): void {
    this.anchor = { row: 0, col: 0 }
    this.focus = { row: lastRow, col: lastCol }
    this.mode = 'normal'
  }
}

const WORD_RE = /[a-zA-Z0-9_]/

export function getWordBounds(text: string, col: number): [number, number] {
  let start = col
  let end = col

  if (text[col] === ' ') {
    while (start > 0 && text[start - 1] === ' ') start--
    while (end < text.length && text[end] === ' ') end++
  } else {
    while (start > 0 && WORD_RE.test(text[start - 1])) start--
    while (end < text.length && WORD_RE.test(text[end])) end++
  }

  return [start, end]
}

export function extractSelectionText(
  rows: { text: string }[],
  range: SelectionRange,
): string {
  const result: string[] = []

  for (let r = range.start.row; r <= range.end.row; r++) {
    const text = rows[r]?.text.slice(1) ?? ''
    const lineStart = r === range.start.row ? range.start.col : 0
    const lineEnd = r === range.end.row ? range.end.col : text.length
    if (lineStart < lineEnd) {
      result.push(text.slice(lineStart, lineEnd))
    }
  }

  return result.join('\n')
}
