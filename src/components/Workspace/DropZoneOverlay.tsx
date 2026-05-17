// Original: Muxy/Views/Workspace/DropZoneOverlay.swift
// Description: Visual highlight overlay for drag drop zones using pane-relative sizing.
// Status: ✅ Completed

import { type DropZone } from '../../models/drag'

interface DropZoneOverlayProps {
  zone: DropZone
}

export function DropZoneOverlay({ zone }: DropZoneOverlayProps): JSX.Element {
  const style = highlightStyle(zone)
  return (
    <div
      className="pointer-events-none absolute rounded"
      style={{
        ...style,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        border: '2px solid rgba(59, 130, 246, 0.4)',
        transition: 'all 0.15s ease-in-out',
      }}
    />
  )
}

function highlightStyle(zone: DropZone): React.CSSProperties {
  // inset = 4px expressed as percentage isn't ideal; we use calc for responsiveness
  const inset = '4px'
  switch (zone) {
    case 'left':
      return {
        left: inset,
        top: inset,
        width: `calc(50% - ${inset} * 1.5)`,
        height: `calc(100% - ${inset} * 2)`,
      }
    case 'right': {
      const halfW = `calc(50% + ${inset} * 0.5)`
      return {
        left: halfW,
        top: inset,
        width: `calc(100% - ${halfW} - ${inset})`,
        height: `calc(100% - ${inset} * 2)`,
      }
    }
    case 'top':
      return {
        left: inset,
        top: inset,
        width: `calc(100% - ${inset} * 2)`,
        height: `calc(50% - ${inset} * 1.5)`,
      }
    case 'bottom': {
      const halfH = `calc(50% + ${inset} * 0.5)`
      return {
        left: inset,
        top: halfH,
        width: `calc(100% - ${inset} * 2)`,
        height: `calc(100% - ${halfH} - ${inset})`,
      }
    }
    case 'center':
      return {
        left: inset,
        top: inset,
        width: `calc(100% - ${inset} * 2)`,
        height: `calc(100% - ${inset} * 2)`,
      }
  }
}
