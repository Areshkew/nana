// Original: N/A — Windows/Linux native caption buttons
// Description: Windows 11-style flat caption buttons (minimize, maximize/restore, close).
// Status: ✅ Completed

import { useState, useCallback } from 'react'
import { useMountEffect } from '../hooks/useMountEffect'

export function WinCaptionButtons(): JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useMountEffect(() => {
    void window.electronAPI.isMaximized().then(setMaximized)
    const cleanup = window.electronAPI.onMaximizedChange(setMaximized)
    return cleanup
  })

  const handleMinimize = useCallback(() => { void window.electronAPI.minimize() }, [])
  const handleMaximize = useCallback(() => { void window.electronAPI.maximize() }, [])
  const handleClose = useCallback(() => { void window.electronAPI.close() }, [])

  return (
    <div className="caption-btn-group">
      <button
        type="button"
        onClick={handleMinimize}
        className="caption-btn caption-btn-minimize"
        aria-label="Minimize"
      >
        <svg width="10" height="1" viewBox="0 0 10 1">
          <line x1="0" y1="0.5" x2="10" y2="0.5" className="caption-btn-glyph" />
        </svg>
      </button>
      <button
        type="button"
        onClick={handleMaximize}
        className="caption-btn caption-btn-maximize"
        aria-label={maximized ? 'Restore' : 'Maximize'}
      >
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="1.5" y="0" width="8" height="8" rx="1" fill="none" className="caption-btn-glyph-restore-bg" />
            <rect x="0" y="2" width="8" height="8" rx="1" fill="var(--nana-bg)" stroke="currentColor" strokeWidth="1" className="caption-btn-glyph" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0.5" y="0.5" width="9" height="9" rx="1" fill="none" className="caption-btn-glyph" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={handleClose}
        className="caption-btn caption-btn-close"
        aria-label="Close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0" y1="0" x2="10" y2="10" className="caption-btn-glyph" />
          <line x1="10" y1="0" x2="0" y2="10" className="caption-btn-glyph" />
        </svg>
      </button>

      <style>{`
        .caption-btn-group {
          display: flex;
          height: 100%;
        }
        .caption-btn {
          width: 46px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--nana-fg-muted);
          cursor: default;
          transition: background-color 0.1s;
        }
        .caption-btn-glyph {
          stroke: currentColor;
          stroke-width: 1;
        }
        .caption-btn-glyph-restore-bg {
          stroke: currentColor;
          stroke-width: 1;
        }
        .caption-btn-minimize:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .caption-btn-maximize:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .caption-btn-close:hover {
          background: #c42b1c;
          color: white;
        }
      `}</style>
    </div>
  )
}
