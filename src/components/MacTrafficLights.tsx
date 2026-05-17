// Original: Native macOS traffic light buttons (system-provided)
// Description: macOS-style traffic light window controls for frameless window.
// Status: ✅ Completed

import { useState, useCallback } from 'react'
import { useMountEffect } from '../hooks/useMountEffect'

export function MacTrafficLights(): JSX.Element {
  const [hovered, setHovered] = useState<string | null>(null)
  const [maximized, setMaximized] = useState(false)

  useMountEffect(() => {
    void window.electronAPI.isMaximized().then(setMaximized)
    const cleanup = window.electronAPI.onMaximizedChange(setMaximized)
    return cleanup
  })

  const handleClose = useCallback(() => { void window.electronAPI.close() }, [])
  const handleMinimize = useCallback(() => { void window.electronAPI.minimize() }, [])
  const handleMaximize = useCallback(() => { void window.electronAPI.maximize() }, [])

  const groupHovered = hovered !== null

  return (
    <div
      className="flex items-center gap-1.5"
      onMouseEnter={() => setHovered('_group')}
      onMouseLeave={() => setHovered(null)}
    >
      <button
        type="button"
        onClick={handleClose}
        className="traffic-light traffic-light-close"
        aria-label="Close"
        onMouseEnter={() => setHovered('close')}
        onMouseLeave={() => setHovered('_group')}
      >
        <svg width="6" height="6" viewBox="0 0 6 6" className="tl-icon">
          <line x1="0" y1="0" x2="6" y2="6" className="tl-icon-line" />
          <line x1="6" y1="0" x2="0" y2="6" className="tl-icon-line" />
        </svg>
      </button>
      <button
        type="button"
        onClick={handleMinimize}
        className="traffic-light traffic-light-minimize"
        aria-label="Minimize"
        onMouseEnter={() => setHovered('minimize')}
        onMouseLeave={() => setHovered('_group')}
      >
        <svg width="8" height="6" viewBox="0 0 8 6" className="tl-icon">
          <line x1="0" y1="3" x2="8" y2="3" className="tl-icon-line" />
        </svg>
      </button>
      <button
        type="button"
        onClick={handleMaximize}
        className={`traffic-light traffic-light-maximize${maximized ? ' is-maximized' : ''}`}
        aria-label={maximized ? 'Restore' : 'Maximize'}
        onMouseEnter={() => setHovered('maximize')}
        onMouseLeave={() => setHovered('_group')}
      >
        <svg width="7" height="7" viewBox="0 0 7 7" className="tl-icon">
          {maximized ? (
            <>
              <rect x="0" y="1.5" width="5" height="5" rx="1" fill="none" className="tl-icon-line" />
              <polyline points="1.5,1.5 1.5,0.5 6.5,0.5 6.5,5.5 5.5,5.5" fill="none" className="tl-icon-line" />
            </>
          ) : (
            <rect x="0" y="0" width="7" height="7" rx="1" fill="none" className="tl-icon-line" />
          )}
        </svg>
      </button>

      <style>{`
        .traffic-light {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: none;
          cursor: default;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: background-color 0.1s;
        }
        .traffic-light-close {
          background: #ff5f57;
        }
        .traffic-light-minimize {
          background: #febc2e;
        }
        .traffic-light-maximize {
          background: #28c840;
        }
        .traffic-light .tl-icon {
          display: none;
        }
        .traffic-light .tl-icon .tl-icon-line {
          stroke: rgba(0, 0, 0, 0.5);
          stroke-width: 1;
        }
        .traffic-light:hover .tl-icon {
          display: block;
        }
        .traffic-light:hover.traffic-light-close {
          background: #ff5f57;
        }
        .traffic-light:hover.traffic-light-minimize {
          background: #febc2e;
        }
        .traffic-light:hover.traffic-light-maximize {
          background: #28c840;
        }
        ${groupHovered ? '' : `
          .traffic-light-close { background: rgba(255, 255, 255, 0.12); }
          .traffic-light-minimize { background: rgba(255, 255, 255, 0.12); }
          .traffic-light-maximize { background: rgba(255, 255, 255, 0.12); }
        `}
      `}</style>
    </div>
  )
}
