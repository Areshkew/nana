// Original: Muxy/Views/VCS/UnifiedDiffView.swift + DiffTextBridge.swift + DiffComponents.swift + DiffTextView.swift
// Description: Canvas-based virtualized diff renderer with chunked section dividers,
//              dynamic gutter widths, vertical separators, hunk labels, and gutter
//              hover/click-to-copy interactivity.
// Status: ✅ Completed

import { useRef, useCallback, useMemo, useState } from 'react'
import { useMountEffect } from '../../hooks/useMountEffect'
import type { DiffDisplayRow } from '../../services/git/diffTypes'
import type { NanaThemeSnapshot } from '../../theme/nanaTheme'
import { buildDiffChunks, maxLineNumber, lineNumberWidth, measureCharWidth, maxLineTextLength } from '../../services/git/diffChunker'
import { SelectionModel, getWordBounds, extractSelectionText } from './selectionModel'
import { getLineSelectionRange, drawContentWithSelection } from './selectionRenderer'

const LINE_HEIGHT = 20
const DIVIDER_HEIGHT = 28
const PREFIX_WIDTH = 16
const PADDING_X = 12
const FONT = '12px "JetBrains Mono", "Cascadia Code", "Fira Code", monospace'
const DIVIDER_FONT = '11px "JetBrains Mono", "Cascadia Code", "Fira Code", monospace'

interface ChunkLayoutItem {
  kind: 'divider' | 'codeBlock'
  y: number
  height: number
  text?: string
  rows?: DiffDisplayRow[]
  startRowIndex?: number
}

interface CodeBlockItem {
  kind: 'codeBlock'
  y: number
  height: number
  rows: DiffDisplayRow[]
}

interface HoveredCell {
  lineIndex: number
  column: 'old' | 'new'
  blockIndex: number
}

interface DiffCanvasSurfaceProps {
  rows: DiffDisplayRow[]
  theme: NanaThemeSnapshot
  filePath?: string
  className?: string
}

function computeLayout(rows: DiffDisplayRow[]): {
  layout: ChunkLayoutItem[]
  totalHeight: number
  colWidth: number
  gutterW: number
} {
  const chunks = buildDiffChunks(rows)
  const maxNum = maxLineNumber(rows)
  const colWidth = lineNumberWidth(maxNum)
  const gutterW = colWidth * 2 + 2 + PREFIX_WIDTH

  let yOffset = 0
  const layout: ChunkLayoutItem[] = []
  let rowIndex = 0

  for (const chunk of chunks) {
    if (chunk.kind === 'divider') {
      layout.push({ kind: 'divider', y: yOffset, height: DIVIDER_HEIGHT, text: chunk.text, startRowIndex: rowIndex })
      rowIndex++
      yOffset += DIVIDER_HEIGHT
    } else if (chunk.rows) {
      layout.push({ kind: 'codeBlock', y: yOffset, height: chunk.rows.length * LINE_HEIGHT, rows: chunk.rows, startRowIndex: rowIndex })
      rowIndex += chunk.rows.length
      yOffset += chunk.rows.length * LINE_HEIGHT
    }
  }

  return { layout, totalHeight: yOffset, colWidth, gutterW }
}

function drawDivider(
  ctx: CanvasRenderingContext2D,
  item: ChunkLayoutItem,
  theme: NanaThemeSnapshot,
  isFirst: boolean,
  fullWidth: number,
) {
  const y = item.y
  const w = fullWidth
  const h = item.height

  ctx.fillStyle = theme.bg
  ctx.fillRect(0, y, w, h)

  if (!isFirst) {
    ctx.fillStyle = theme.border
    ctx.fillRect(0, y, w, 1)
  }

  ctx.fillStyle = theme.border
  ctx.fillRect(0, y + h - 1, w, 1)

  ctx.font = DIVIDER_FONT
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = theme.fgDim
  const textY = y + h / 2
  ctx.fillText(item.text ?? '', PADDING_X + 4, textY)
}

function drawGutter(
  ctx: CanvasRenderingContext2D,
  row: DiffDisplayRow,
  rowIndex: number,
  y: number,
  theme: NanaThemeSnapshot,
  colWidth: number,
  hovered: HoveredCell | null,
) {
  const yText = y - 2
  ctx.font = FONT
  ctx.textBaseline = 'bottom'

  if (row.oldLineNumber !== null) {
    const isHovered = hovered?.lineIndex === rowIndex && hovered?.column === 'old'
    ctx.textAlign = 'right'
    ctx.fillStyle = isHovered ? theme.fg : theme.fgDim
    ctx.fillText(String(row.oldLineNumber), colWidth - 4, yText)
  }

  if (row.newLineNumber !== null) {
    const isHovered = hovered?.lineIndex === rowIndex && hovered?.column === 'new'
    ctx.textAlign = 'right'
    ctx.fillStyle = isHovered ? theme.fgMuted : theme.fgDim
    ctx.fillText(String(row.newLineNumber), colWidth * 2 + 1 - 4, yText)
  }

  const prefixX = colWidth * 2 + 2 + PREFIX_WIDTH / 2
  ctx.textAlign = 'center'
  switch (row.kind) {
    case 'addition':
      ctx.fillStyle = theme.diffAddFg
      ctx.fillText('+', prefixX, yText)
      break
    case 'deletion':
      ctx.fillStyle = theme.diffRemoveFg
      ctx.fillText('-', prefixX, yText)
      break
    case 'context':
      ctx.fillStyle = theme.fgDim
      ctx.fillText(' ', prefixX, yText)
      break
    default:
      break
  }
}

function drawGutterSeparators(
  ctx: CanvasRenderingContext2D,
  blockY: number,
  blockHeight: number,
  colWidth: number,
  gutterW: number,
  theme: NanaThemeSnapshot,
) {
  ctx.fillStyle = theme.border
  ctx.fillRect(colWidth, blockY, 1, blockHeight)
  ctx.fillRect(colWidth * 2 + 1, blockY, 1, blockHeight)
  ctx.fillRect(gutterW, blockY, 1, blockHeight)
}

function drawContent(
  ctx: CanvasRenderingContext2D,
  row: DiffDisplayRow,
  contentY: number,
  contentWidth: number,
  theme: NanaThemeSnapshot,
  gutterW: number,
  charWidth: number,
  lineSel: import('./selectionRenderer').LineSelectionRange | null,
) {
  const contentX = gutterW + 1 + PADDING_X

  if (row.kind !== 'context') {
    switch (row.kind) {
      case 'addition':
        ctx.fillStyle = theme.diffAddBg
        break
      case 'deletion':
        ctx.fillStyle = theme.diffRemoveBg
        break
      case 'hunk':
        ctx.fillStyle = theme.diffHunkBg
        break
      case 'collapsed':
        ctx.fillStyle = theme.surface
        break
      default:
        break
    }
    ctx.fillRect(gutterW, contentY - LINE_HEIGHT, contentWidth - gutterW, LINE_HEIGHT)
  }

  const displayText = row.text.length > 1 ? row.text.slice(1) : row.text
  drawContentWithSelection(ctx, displayText, contentY, contentX, contentWidth, theme, charWidth, LINE_HEIGHT, lineSel)
}

export function DiffCanvasSurface({
  rows,
  theme,
  filePath,
  className,
}: DiffCanvasSurfaceProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [, setHovered] = useState<HoveredCell | null>(null)
  const hoveredRef = useRef<HoveredCell | null>(null)
  const rafRef = useRef(0)
  const selectionModelRef = useRef(new SelectionModel())
  const isSelectingRef = useRef(false)

  const { layout, totalHeight, colWidth, gutterW } = useMemo(
    () => computeLayout(rows),
    [rows],
  )

  const charWidth = useMemo(() => measureCharWidth(), [])
  const maxLineLen = useMemo(() => maxLineTextLength(rows), [rows])
  const contentScrollWidth = useMemo(
    () => charWidth * maxLineLen + gutterW + 1 + PADDING_X * 2,
    [charWidth, maxLineLen, gutterW],
  )

  const codeBlocks = useMemo(
    () => layout.filter((item): item is CodeBlockItem => item.kind === 'codeBlock' && item.rows !== undefined),
    [layout],
  )

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    const scrollEl = scrollRef.current
    if (!canvas || !scrollEl || layout.length === 0) return

    const dpr = window.devicePixelRatio || 1
    const viewWidth = scrollEl.clientWidth
    const viewHeight = scrollEl.clientHeight

    if (canvas.width !== viewWidth * dpr || canvas.height !== viewHeight * dpr) {
      canvas.width = viewWidth * dpr
      canvas.height = viewHeight * dpr
      canvas.style.width = `${viewWidth}px`
      canvas.style.height = `${viewHeight}px`
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scrollTop = scrollEl.scrollTop
    const scrollLeft = scrollEl.scrollLeft
    const currentHovered = hoveredRef.current
    const selectionRange = selectionModelRef.current.orderedRange

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, viewWidth, viewHeight)
    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, viewWidth, viewHeight)
    ctx.translate(-scrollLeft, -scrollTop)

    let chunkIndex = 0
    for (const item of layout) {
      const itemEnd = item.y + item.height
      if (itemEnd < scrollTop || item.y > scrollTop + viewHeight) {
        chunkIndex++
        continue
      }

      if (item.kind === 'divider') {
        drawDivider(ctx, item, theme, chunkIndex === 0, contentScrollWidth)
      } else if (item.kind === 'codeBlock' && item.rows) {
        drawGutterSeparators(ctx, item.y, item.height, colWidth, gutterW, theme)

        for (let i = 0; i < item.rows.length; i++) {
          const row = item.rows[i]
          const rowY = item.y + (i + 1) * LINE_HEIGHT
          const globalRowIndex = item.startRowIndex! + i
          const lineSel = getLineSelectionRange(globalRowIndex, selectionRange)

          drawGutter(ctx, row, i, rowY, theme, colWidth, currentHovered)
          drawContent(ctx, row, rowY, contentScrollWidth, theme, gutterW, charWidth, lineSel)
        }
      }

      chunkIndex++
    }
  }, [layout, colWidth, gutterW, theme, contentScrollWidth, charWidth])

  const renderFrameRef = useRef(renderFrame)
  renderFrameRef.current = renderFrame

  useMountEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const scheduleRedraw = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
    }

    const onScroll = () => scheduleRedraw()
    el.addEventListener('scroll', onScroll, { passive: true })
    scheduleRedraw()

    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
      // Release GPU backing store to prevent memory leaks
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
      }
    }
  })

  const hitTest = useCallback(
    (x: number, y: number): HoveredCell | null => {
      let blockIndex = 0
      for (const item of layout) {
        if (y < item.y || y >= item.y + item.height) {
          if (item.kind === 'codeBlock') blockIndex++
          continue
        }
        if (item.kind !== 'codeBlock' || !item.rows) return null

        const lineIndex = Math.floor((y - item.y) / LINE_HEIGHT)
        if (lineIndex < 0 || lineIndex >= item.rows.length) return null

        if (x < colWidth && item.rows[lineIndex].oldLineNumber !== null) {
          return { lineIndex, column: 'old', blockIndex }
        }
        if (x >= colWidth + 1 && x < colWidth * 2 + 1 && item.rows[lineIndex].newLineNumber !== null) {
          return { lineIndex, column: 'new', blockIndex }
        }
        return null
      }
      return null
    },
    [layout, colWidth],
  )

  const hitTestText = useCallback(
    (x: number, y: number): { row: number; col: number } | null => {
      for (const item of layout) {
        if (y < item.y || y >= item.y + item.height) continue
        if (item.kind !== 'codeBlock' || !item.rows || item.startRowIndex === undefined) return null

        const lineIndex = Math.floor((y - item.y) / LINE_HEIGHT)
        if (lineIndex < 0 || lineIndex >= item.rows.length) return null

        if (x < gutterW) return null

        const contentX = x - gutterW - 1 - PADDING_X
        const col = Math.floor(contentX / charWidth)
        const text = item.rows[lineIndex].text.slice(1)
        const clampedCol = Math.max(0, Math.min(col, text.length))

        return { row: item.startRowIndex + lineIndex, col: clampedCol }
      }
      return null
    },
    [layout, gutterW, charWidth],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left + e.currentTarget.scrollLeft
      const y = e.clientY - rect.top + e.currentTarget.scrollTop

      // Update selection drag
      if (isSelectingRef.current) {
        const point = hitTestText(x, y)
        if (point) {
          selectionModelRef.current.setFocus(point)
          cancelAnimationFrame(rafRef.current)
          rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
        }
      }

      // Update gutter hover
      const cell = hitTest(x, y)
      const prev = hoveredRef.current
      if (cell === null && prev === null) return
      if (
        cell !== null && prev !== null &&
        cell.lineIndex === prev.lineIndex &&
        cell.column === prev.column &&
        cell.blockIndex === prev.blockIndex
      ) return

      hoveredRef.current = cell
      setHovered(cell)
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
    },
    [hitTest, hitTestText],
  )

  const handleMouseLeave = useCallback(() => {
    if (hoveredRef.current === null) return
    hoveredRef.current = null
    setHovered(null)
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
  }, [])

  const handleClick = useCallback(() => {
    const cell = hoveredRef.current
    if (!cell || !filePath) return

    const block = codeBlocks[cell.blockIndex]
    if (!block || cell.lineIndex >= block.rows.length) return
    const row = block.rows[cell.lineIndex]
    const num =
      cell.column === 'old' ? row.oldLineNumber : row.newLineNumber
    if (num === null) return

    const reference = `${filePath}:${num}`
    navigator.clipboard.writeText(reference).catch(() => void 0)
  }, [filePath, codeBlocks])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      const el = e.currentTarget
      const rect = el.getBoundingClientRect()
      const clientX = e.clientX - rect.left
      const clientY = e.clientY - rect.top
      const x = clientX + el.scrollLeft
      const y = clientY + el.scrollTop

      // Ignore scrollbar clicks
      if (el.scrollHeight > el.clientHeight && clientX >= el.clientWidth) return
      if (el.scrollWidth > el.clientWidth && clientY >= el.clientHeight) return

      // Gutter click — don't start text selection
      const gutterCell = hitTest(x, y)
      if (gutterCell) {
        // Let the existing click handler deal with gutter copy
        return
      }

      const point = hitTestText(x, y)
      if (!point) return

      el.focus({ preventScroll: true })
      e.preventDefault()

      if (e.detail === 2) {
        // Double click — select word
        const text = rows[point.row]?.text.slice(1) ?? ''
        const [wordStart, wordEnd] = getWordBounds(text, point.col)
        selectionModelRef.current.anchor = { row: point.row, col: wordStart }
        selectionModelRef.current.focus = { row: point.row, col: wordEnd }
        selectionModelRef.current.mode = 'word'
        isSelectingRef.current = false
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
        return
      }

      if (e.detail === 3) {
        // Triple click — select line
        const text = rows[point.row]?.text.slice(1) ?? ''
        selectionModelRef.current.anchor = { row: point.row, col: 0 }
        selectionModelRef.current.focus = { row: point.row, col: text.length }
        selectionModelRef.current.mode = 'line'
        isSelectingRef.current = false
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
        return
      }

      // Single click — start new selection
      isSelectingRef.current = true
      selectionModelRef.current.setAnchor(point)
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
    },
    [hitTest, hitTestText, rows],
  )

  const handleMouseUp = useCallback(() => {
    isSelectingRef.current = false
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const cmd = isMac ? e.metaKey : e.ctrlKey

      if (cmd && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        if (rows.length === 0) return
        const lastRow = rows.length - 1
        const lastText = rows[lastRow]?.text.slice(1) ?? ''
        selectionModelRef.current.selectAll(lastRow, lastText.length)
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        selectionModelRef.current.clear()
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
      }

      // Ctrl/Cmd+C — copy selection to clipboard directly since canvas
      // has no native text selection to trigger the copy event
      if (cmd && e.key.toLowerCase() === 'c') {
        const range = selectionModelRef.current.orderedRange
        if (!range) return
        const text = extractSelectionText(rows, range)
        if (!text) return
        e.preventDefault()
        const api = (window as unknown as Record<string, unknown>).electronAPI as
          | { clipboardWriteText: (t: string) => void }
          | undefined
        if (api?.clipboardWriteText) {
          api.clipboardWriteText(text)
        } else {
          void navigator.clipboard.writeText(text)
        }
      }
    },
    [rows],
  )

  const handleCopy = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const range = selectionModelRef.current.orderedRange
      if (!range) return
      const text = extractSelectionText(rows, range)
      if (!text) return
      e.clipboardData.setData('text/plain', text)
      e.preventDefault()
    },
    [rows],
  )

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: 12,
          fontSize: 12,
          color: theme.fgMuted,
          textAlign: 'center',
        }}
      >
        Empty diff
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className={className}
      tabIndex={0}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onCopy={handleCopy}
      style={{
        overflow: 'auto',
        position: 'relative',
        height: '100%',
        outline: 'none',
      }}
    >
      <div style={{ height: totalHeight, width: contentScrollWidth, minWidth: '100%', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}
