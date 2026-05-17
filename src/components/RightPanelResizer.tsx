// Original: Muxy/Views/MainWindow.swift — sidePanelResizeHandle (lines 559-573)
// Description: 5px-wide draggable divider for the right panel. Range 200-800px.
//              Persists width on mouse-up via commitWidth.
// Status: Completed

import { useRef, useCallback } from 'react'
import { useMountEffect } from '../hooks/useMountEffect'

interface RightPanelResizerProps {
  width: number
  onWidthChange: (width: number) => void
  onCommit: () => void
}

export function RightPanelResizer({
  width,
  onWidthChange,
  onCommit,
}: RightPanelResizerProps): JSX.Element {
  const anchorRef = useRef<number | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useMountEffect(() => {
    return () => {
      cleanupRef.current?.()
    }
  })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      anchorRef.current = width
      const startX = e.clientX
      let raf = 0

      function onMouseMove(ev: MouseEvent): void {
        if (anchorRef.current === null) return
        // Right panel: dragging LEFT decreases width (opposite of sidebar)
        const proposed = anchorRef.current - (ev.clientX - startX)
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() => {
          onWidthChange(proposed)
        })
      }

      function onMouseUp(): void {
        cancelAnimationFrame(raf)
        anchorRef.current = null
        cleanupRef.current = null
        onCommit()
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      const cleanup = (): void => {
        cancelAnimationFrame(raf)
        anchorRef.current = null
        cleanupRef.current = null
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      cleanupRef.current = cleanup
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [width, onWidthChange, onCommit],
  )

  return (
    <div
      className="h-full w-[5px] shrink-0 cursor-col-resize"
      style={{
        borderLeft: `1px solid var(--nana-border)`,
        background: 'transparent',
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--nana-hover)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
      aria-hidden="true"
    />
  )
}
