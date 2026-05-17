// Original: N/A — project infrastructure hook
// Description: Handles click-outside and Escape-key closing for a context menu.
// Status: ✅ Completed

import { useEffect, useRef } from 'react'

export function useContextMenu(isOpen: boolean, onClose: () => void) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener('click', handleClick, true)
    return () => window.removeEventListener('click', handleClick, true)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const CLOSE_EVENT = 'nana:close-context-menu'
    window.dispatchEvent(new Event(CLOSE_EVENT))
    const handle = () => onClose()
    window.addEventListener(CLOSE_EVENT, handle)
    return () => window.removeEventListener(CLOSE_EVENT, handle)
  }, [isOpen, onClose])

  return menuRef
}
