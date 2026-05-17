// Original: N/A — shared virtualization infrastructure
// Description: Universal virtual list wrapping @tanstack/react-virtual for file
//              trees (100K+ nodes), VCS change lists (1000+ files), and commit logs.
// Status: Completed

import { useRef, useCallback, type CSSProperties, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMountEffect } from '../../../hooks/useMountEffect'

interface VirtualListProps<T> {
  items: readonly T[]
  estimateSize: (index: number) => number
  renderItem: (item: T, index: number) => ReactNode
  getItemKey?: (index: number) => string | number
  overscan?: number
  className?: string
  style?: CSSProperties
  onScrollEnd?: () => void
}

export function VirtualList<T>({
  items,
  estimateSize,
  renderItem,
  getItemKey,
  overscan = 5,
  className,
  style,
  onScrollEnd,
}: VirtualListProps<T>): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan,
    getItemKey: getItemKey ?? undefined,
  })

  useMountEffect(() => {
    const el = scrollRef.current
    if (!el || !onScrollEnd) return
    function handleScroll() {
      const { scrollTop, scrollHeight, clientHeight } = el!
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        onScrollEnd!()
      }
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  })

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = virtualizer.getVirtualItems()[0]?.index ?? 0
      const step = e.key === 'PageDown' ? 20 : e.key === 'PageUp' ? -20 : 0
      if (step === 0) return
      e.preventDefault()
      virtualizer.scrollToIndex(Math.max(0, Math.min(items.length - 1, idx + step)))
    },
    [virtualizer, items.length],
  )

  return (
    <div
      ref={scrollRef}
      className={className}
      style={{
        overflow: 'auto',
        height: '100%',
        ...style,
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
