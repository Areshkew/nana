// Original: Muxy/Views/VCS/SplitDiffView.swift + DiffTextView.swift (single-column gutter)
// Description: Canvas-based side-by-side diff renderer. Left pane shows old content,
//              right pane shows new content, with separate single-column gutters.
// Status: ✅ Completed

import { useRef, useCallback, useMemo, useState } from 'react'
import { useMountEffect } from '../../hooks/useMountEffect'
import type { DiffDisplayRow } from '../../services/git/diffTypes'
import type { NanaThemeSnapshot } from '../../theme/nanaTheme'
import { maxLineNumber, lineNumberWidth, measureCharWidth, maxLineTextLength } from '../../services/git/diffChunker'
import { buildSplitDiffChunks } from '../../services/git/splitDiffPairer'
import { SelectionModel, getWordBounds } from './selectionModel'
import { getLineSelectionRange, drawContentWithSelection } from './selectionRenderer'
import { buildVirtualRowMap, findVirtualRow, findVirtualRowByBlockLine } from './splitSelectionModel'

const LINE_HEIGHT = 20
const DIVIDER_HEIGHT = 28
const PADDING_X = 6
const FONT = '12px "JetBrains Mono", "Cascadia Code", "Fira Code", monospace'
const DIVIDER_FONT = '11px "JetBrains Mono", "Cascadia Code", "Fira Code", monospace'

interface SplitLayoutItem {
  kind: 'divider' | 'codeBlock'
  y: number
  height: number
  text?: string | undefined
  leftRows?: DiffDisplayRow[] | undefined
  rightRows?: DiffDisplayRow[] | undefined
}

interface SplitCodeBlockItem {
  kind: 'codeBlock'
  y: number
  height: number
  leftRows: DiffDisplayRow[]
  rightRows: DiffDisplayRow[]
}

interface HoveredCell {
  lineIndex: number
  column: 'left' | 'right'
  blockIndex: number
}

interface SplitDiffCanvasProps {
  rows: DiffDisplayRow[]
  theme: NanaThemeSnapshot
  filePath?: string
  className?: string
}

function computeSplitLayout(rows: DiffDisplayRow[]): {
  layout: SplitLayoutItem[]
  totalHeight: number
  colWidth: number
  singleGutterW: number
} {
  const chunks = buildSplitDiffChunks(rows)
  const maxNum = maxLineNumber(rows)
  const colWidth = lineNumberWidth(maxNum)
  const singleGutterW = colWidth + 1

  let yOffset = 0
  const layout: SplitLayoutItem[] = []

  for (const chunk of chunks) {
    if (chunk.kind === 'divider') {
      layout.push({ kind: 'divider', y: yOffset, height: DIVIDER_HEIGHT, text: chunk.text })
      yOffset += DIVIDER_HEIGHT
    } else {
      const count = Math.max(chunk.leftRows?.length ?? 0, chunk.rightRows?.length ?? 0)
      layout.push({
        kind: 'codeBlock',
        y: yOffset,
        height: count * LINE_HEIGHT,
        leftRows: chunk.leftRows,
        rightRows: chunk.rightRows,
      })
      yOffset += count * LINE_HEIGHT
    }
  }

  return { layout, totalHeight: yOffset, colWidth, singleGutterW }
}

function drawSplitDivider(
  ctx: CanvasRenderingContext2D,
  item: SplitLayoutItem,
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

function drawSingleGutter(
  ctx: CanvasRenderingContext2D,
  row: DiffDisplayRow | null,
  rowIndex: number,
  y: number,
  theme: NanaThemeSnapshot,
  colWidth: number,
  gutterStartX: number,
  hovered: HoveredCell | null,
  column: 'left' | 'right',
) {
  if (!row) return

  const num = column === 'left' ? row.oldLineNumber : row.newLineNumber
  if (num === null) return

  const isHovered = hovered?.lineIndex === rowIndex && hovered?.column === column
  const yText = y - 2
  ctx.font = FONT
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'right'
  ctx.fillStyle = isHovered ? theme.fg : theme.fgDim
  ctx.fillText(String(num), gutterStartX + colWidth - 4, yText)
}

function drawSingleContent(
  ctx: CanvasRenderingContext2D,
  row: DiffDisplayRow | null,
  contentY: number,
  contentStartX: number,
  contentEndX: number,
  theme: NanaThemeSnapshot,
  backgroundSide: 'left' | 'right',
  charWidth: number,
  lineSel: import('./selectionRenderer').LineSelectionRange | null,
) {
  if (!row) return

  const textX = contentStartX + PADDING_X
  const contentWidth = contentEndX - contentStartX

  // Backgrounds match backgroundSide
  if (row.kind === 'deletion' && (backgroundSide === 'left')) {
    ctx.fillStyle = theme.diffRemoveBg
    ctx.fillRect(contentStartX, contentY - LINE_HEIGHT, contentWidth, LINE_HEIGHT)
  } else if (row.kind === 'addition' && (backgroundSide === 'right')) {
    ctx.fillStyle = theme.diffAddBg
    ctx.fillRect(contentStartX, contentY - LINE_HEIGHT, contentWidth, LINE_HEIGHT)
  }

  const displayText = row.text.length > 1 ? row.text.slice(1) : row.text
  drawContentWithSelection(ctx, displayText, contentY, textX, contentEndX, theme, charWidth, LINE_HEIGHT, lineSel)
}

export function SplitDiffCanvas({
  rows,
  theme,
  filePath,
  className,
}: SplitDiffCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [, setHovered] = useState<HoveredCell | null>(null)
  const hoveredRef = useRef<HoveredCell | null>(null)
  const rafRef = useRef(0)
  const leftSelectionRef = useRef(new SelectionModel())
  const rightSelectionRef = useRef(new SelectionModel())
  const activePaneRef = useRef<'left' | 'right' | null>(null)
  const isSelectingRef = useRef(false)

  const { layout, totalHeight, colWidth, singleGutterW } = useMemo(
    () => computeSplitLayout(rows),
    [rows],
  )

  const charWidth = useMemo(() => measureCharWidth(), [])
  const maxLineLen = useMemo(() => maxLineTextLength(rows), [rows])
  const contentScrollWidth = useMemo(() => {
    const contentPaneWidth = charWidth * maxLineLen + singleGutterW + PADDING_X * 2
    return contentPaneWidth * 2 + 1
  }, [charWidth, maxLineLen, singleGutterW])

  const codeBlocks = useMemo(
    () => layout.filter((item): item is SplitCodeBlockItem =>
      item.kind === 'codeBlock' && item.leftRows !== undefined && item.rightRows !== undefined,
    ),
    [layout],
  )

  const leftVirtualMap = useMemo(() => buildVirtualRowMap(layout, 'left'), [layout])
  const rightVirtualMap = useMemo(() => buildVirtualRowMap(layout, 'right'), [layout])

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    const scrollEl = scrollRef.current
    if (!canvas || !scrollEl || layout.length === 0) return

    const dpr = window.devicePixelRatio || 1
    const viewWidth = scrollEl.clientWidth
    const viewHeight = scrollEl.clientHeight
    const effectiveWidth = Math.max(contentScrollWidth, viewWidth)
    const paneWidth = (effectiveWidth - 1) / 2

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
    const leftSel = leftSelectionRef.current.orderedRange
    const rightSel = rightSelectionRef.current.orderedRange

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, viewWidth, viewHeight)
    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, viewWidth, viewHeight)
    ctx.translate(-scrollLeft, -scrollTop)

    let chunkIndex = 0
    let blockIndex = 0
    for (const item of layout) {
      const itemEnd = item.y + item.height
      if (itemEnd < scrollTop || item.y > scrollTop + viewHeight) {
        chunkIndex++
        if (item.kind === 'codeBlock') blockIndex++
        continue
      }

      if (item.kind === 'divider') {
        drawSplitDivider(ctx, item, theme, chunkIndex === 0, effectiveWidth)
      } else {
        const leftGutterStart = 0
        const leftContentStart = leftGutterStart + singleGutterW
        const paneEnd = leftContentStart + paneWidth - singleGutterW
        const borderX = leftContentStart + (paneEnd - leftContentStart)
        const rightGutterStart = borderX + 1
        const rightContentStart = rightGutterStart + singleGutterW

        ctx.fillStyle = theme.border
        ctx.fillRect(borderX, item.y, 1, item.height)

        ctx.fillStyle = theme.border
        ctx.fillRect(leftGutterStart + colWidth, item.y, 1, item.height)

        ctx.fillStyle = theme.border
        ctx.fillRect(rightGutterStart + colWidth, item.y, 1, item.height)

        const leftRows = item.leftRows ?? []
        const rightRows = item.rightRows ?? []
        const lineCount = Math.max(leftRows.length, rightRows.length)

        for (let i = 0; i < lineCount; i++) {
          const rowY = item.y + (i + 1) * LINE_HEIGHT
          const leftRow = i < leftRows.length ? leftRows[i] : null
          const rightRow = i < rightRows.length ? rightRows[i] : null

          const leftVrow = findVirtualRowByBlockLine(leftVirtualMap, blockIndex, i)
          const rightVrow = findVirtualRowByBlockLine(rightVirtualMap, blockIndex, i)

          const leftLineSel = leftVrow !== null ? getLineSelectionRange(leftVrow, leftSel) : null
          const rightLineSel = rightVrow !== null ? getLineSelectionRange(rightVrow, rightSel) : null

          drawSingleGutter(ctx, leftRow, i, rowY, theme, colWidth, leftGutterStart, currentHovered, 'left')
          drawSingleContent(ctx, leftRow, rowY, leftContentStart, paneEnd, theme, 'left', charWidth, leftLineSel)

          drawSingleGutter(ctx, rightRow, i, rowY, theme, colWidth, rightGutterStart, currentHovered, 'right')
          drawSingleContent(ctx, rightRow, rowY, rightContentStart, effectiveWidth, theme, 'right', charWidth, rightLineSel)
        }

        blockIndex++
      }

      chunkIndex++
    }
  }, [layout, colWidth, singleGutterW, theme, contentScrollWidth, charWidth, leftVirtualMap, rightVirtualMap])

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
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
      }
    }
  })

  const getPaneMetrics = useCallback(() => {
    const viewWidth = scrollRef.current?.clientWidth ?? 800
    const effectiveWidth = Math.max(contentScrollWidth, viewWidth)
    const paneWidth = (effectiveWidth - 1) / 2
    const leftContentStart = singleGutterW
    const paneEnd = leftContentStart + paneWidth - singleGutterW
    const borderX = leftContentStart + (paneEnd - leftContentStart)
    const rightGutterStart = borderX + 1
    const rightContentStart = rightGutterStart + singleGutterW
    return { paneWidth, leftContentStart, paneEnd, borderX, rightGutterStart, rightContentStart }
  }, [contentScrollWidth, singleGutterW])

  const hitTest = useCallback(
    (x: number, y: number): HoveredCell | null => {
      const { rightGutterStart } = getPaneMetrics()

      let blockIndex = 0
      for (const item of layout) {
        if (y < item.y || y >= item.y + item.height) {
          if (item.kind === 'codeBlock') blockIndex++
          continue
        }
        if (item.kind !== 'codeBlock') return null

        const leftRows = item.leftRows ?? []
        const rightRows = item.rightRows ?? []
        const lineCount = Math.max(leftRows.length, rightRows.length)
        const lineIndex = Math.floor((y - item.y) / LINE_HEIGHT)
        if (lineIndex < 0 || lineIndex >= lineCount) return null

        if (x < colWidth) {
          const leftRow = lineIndex < leftRows.length ? leftRows[lineIndex] : null
          if (leftRow?.oldLineNumber !== null && leftRow?.oldLineNumber !== undefined) {
            return { lineIndex, column: 'left', blockIndex }
          }
        }
        if (x >= rightGutterStart && x < rightGutterStart + colWidth) {
          const rightRow = lineIndex < rightRows.length ? rightRows[lineIndex] : null
          if (rightRow?.newLineNumber !== null && rightRow?.newLineNumber !== undefined) {
            return { lineIndex, column: 'right', blockIndex }
          }
        }
        return null
      }
      return null
    },
    [layout, colWidth, getPaneMetrics],
  )

  const hitTestText = useCallback(
    (x: number, y: number): { pane: 'left' | 'right'; vrow: number; col: number } | null => {
      const { leftContentStart, paneEnd, rightContentStart } = getPaneMetrics()

      for (const item of layout) {
        if (y < item.y || y >= item.y + item.height) continue
        if (item.kind !== 'codeBlock') return null

        const lineIndex = Math.floor((y - item.y) / LINE_HEIGHT)
        const rowY = item.y + lineIndex * LINE_HEIGHT

        if (x >= leftContentStart && x < paneEnd) {
          const vrow = findVirtualRow(leftVirtualMap, rowY, LINE_HEIGHT)
          if (vrow === null) return null
          const contentX = x - leftContentStart - PADDING_X
          const col = Math.floor(contentX / charWidth)
          const leftRows = item.leftRows ?? []
          const row = leftRows[lineIndex]
          const text = row?.text.slice(1) ?? ''
          return { pane: 'left', vrow, col: Math.max(0, Math.min(col, text.length)) }
        }

        if (x >= rightContentStart) {
          const vrow = findVirtualRow(rightVirtualMap, rowY, LINE_HEIGHT)
          if (vrow === null) return null
          const contentX = x - rightContentStart - PADDING_X
          const col = Math.floor(contentX / charWidth)
          const rightRows = item.rightRows ?? []
          const row = rightRows[lineIndex]
          const text = row?.text.slice(1) ?? ''
          return { pane: 'right', vrow, col: Math.max(0, Math.min(col, text.length)) }
        }

        return null
      }
      return null
    },
    [layout, getPaneMetrics, charWidth, leftVirtualMap, rightVirtualMap],
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
    if (!block) return
    const paneRows = cell.column === 'left' ? (block.leftRows ?? []) : (block.rightRows ?? [])
    if (cell.lineIndex >= paneRows.length) return
    const row = paneRows[cell.lineIndex]
    if (!row) return
    const num = cell.column === 'left' ? row.oldLineNumber : row.newLineNumber
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
      if (gutterCell) return

      const point = hitTestText(x, y)
      if (!point) return

      el.focus({ preventScroll: true })
      e.preventDefault()
      activePaneRef.current = point.pane
      const model = point.pane === 'left' ? leftSelectionRef.current : rightSelectionRef.current
      const otherModel = point.pane === 'left' ? rightSelectionRef.current : leftSelectionRef.current
      otherModel.clear()

      if (e.detail === 2) {
        const vmap = point.pane === 'left' ? leftVirtualMap : rightVirtualMap
        const row = vmap[point.vrow]?.row
        const text = row?.text.slice(1) ?? ''
        const [wordStart, wordEnd] = getWordBounds(text, point.col)
        model.anchor = { row: point.vrow, col: wordStart }
        model.focus = { row: point.vrow, col: wordEnd }
        model.mode = 'word'
        isSelectingRef.current = false
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
        return
      }

      if (e.detail === 3) {
        const vmap = point.pane === 'left' ? leftVirtualMap : rightVirtualMap
        const row = vmap[point.vrow]?.row
        const text = row?.text.slice(1) ?? ''
        model.anchor = { row: point.vrow, col: 0 }
        model.focus = { row: point.vrow, col: text.length }
        model.mode = 'line'
        isSelectingRef.current = false
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
        return
      }

      isSelectingRef.current = true
      model.setAnchor({ row: point.vrow, col: point.col })
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
    },
    [hitTest, hitTestText, leftVirtualMap, rightVirtualMap],
  )

  const handleMouseUp = useCallback(() => {
    isSelectingRef.current = false
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left + e.currentTarget.scrollLeft
      const y = e.clientY - rect.top + e.currentTarget.scrollTop

      // Update selection drag
      if (isSelectingRef.current && activePaneRef.current) {
        const point = hitTestText(x, y)
        if (point?.pane === activePaneRef.current) {
          const model = point.pane === 'left' ? leftSelectionRef.current : rightSelectionRef.current
          model.setFocus({ row: point.vrow, col: point.col })
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const cmd = isMac ? e.metaKey : e.ctrlKey
      const pane = activePaneRef.current ?? 'left'
      const model = pane === 'left' ? leftSelectionRef.current : rightSelectionRef.current
      const vmap = pane === 'left' ? leftVirtualMap : rightVirtualMap

      if (cmd && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        if (vmap.length === 0) return
        const lastVrow = vmap.length - 1
        const lastText = vmap[lastVrow]?.row.text.slice(1) ?? ''
        model.selectAll(lastVrow, lastText.length)
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        leftSelectionRef.current.clear()
        rightSelectionRef.current.clear()
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => renderFrameRef.current())
      }

      // Ctrl/Cmd+C — copy selection directly since canvas has no native selection
      if (cmd && e.key.toLowerCase() === 'c') {
        let text = ''
        const leftRange = leftSelectionRef.current.orderedRange
        const rightRange = rightSelectionRef.current.orderedRange

        if (leftRange) {
          const texts: string[] = []
          for (let r = leftRange.start.row; r <= leftRange.end.row; r++) {
            const entry = leftVirtualMap[r]
            if (!entry) continue
            const t = entry.row.text.slice(1)
            const lineStart = r === leftRange.start.row ? leftRange.start.col : 0
            const lineEnd = r === leftRange.end.row ? leftRange.end.col : t.length
            texts.push(t.slice(lineStart, lineEnd))
          }
          text = texts.join('\n')
        } else if (rightRange) {
          const texts: string[] = []
          for (let r = rightRange.start.row; r <= rightRange.end.row; r++) {
            const entry = rightVirtualMap[r]
            if (!entry) continue
            const t = entry.row.text.slice(1)
            const lineStart = r === rightRange.start.row ? rightRange.start.col : 0
            const lineEnd = r === rightRange.end.row ? rightRange.end.col : t.length
            texts.push(t.slice(lineStart, lineEnd))
          }
          text = texts.join('\n')
        }

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
    [leftVirtualMap, rightVirtualMap],
  )

  const handleCopy = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      let text = ''
      const leftRange = leftSelectionRef.current.orderedRange
      const rightRange = rightSelectionRef.current.orderedRange

      if (leftRange) {
        const texts: string[] = []
        for (let r = leftRange.start.row; r <= leftRange.end.row; r++) {
          const entry = leftVirtualMap[r]
          if (!entry) continue
          const t = entry.row.text.slice(1)
          const lineStart = r === leftRange.start.row ? leftRange.start.col : 0
          const lineEnd = r === leftRange.end.row ? leftRange.end.col : t.length
          texts.push(t.slice(lineStart, lineEnd))
        }
        text = texts.join('\n')
      } else if (rightRange) {
        const texts: string[] = []
        for (let r = rightRange.start.row; r <= rightRange.end.row; r++) {
          const entry = rightVirtualMap[r]
          if (!entry) continue
          const t = entry.row.text.slice(1)
          const lineStart = r === rightRange.start.row ? rightRange.start.col : 0
          const lineEnd = r === rightRange.end.row ? rightRange.end.col : t.length
          texts.push(t.slice(lineStart, lineEnd))
        }
        text = texts.join('\n')
      }

      if (!text) return
      e.clipboardData.setData('text/plain', text)
      e.preventDefault()
    },
    [leftVirtualMap, rightVirtualMap],
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
