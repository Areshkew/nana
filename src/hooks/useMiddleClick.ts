// Original: Muxy/Views/Components/MiddleClickView.swift
// Description: Hook that fires callback on middle-click (auxclick/button 1).
// Status: ✅ Completed

import { useRef, useCallback } from 'react'

export function useMiddleClick<T extends HTMLElement>(onMiddleClick: () => void) {
  const ref = useRef<T>(null)

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault()
        onMiddleClick()
      }
    },
    [onMiddleClick],
  )

  const setRef = useCallback(
    (node: T | null) => {
      const current = ref.current
      if (current) {
        current.removeEventListener('mouseup', handleMouseUp)
      }
      if (node) {
        node.addEventListener('mouseup', handleMouseUp)
      }
      const mutableRef = ref
      mutableRef.current = node
    },
    [handleMouseUp],
  )

  return setRef
}
