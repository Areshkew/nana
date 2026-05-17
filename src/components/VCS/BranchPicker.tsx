// Original: Muxy/Views/VCS/BranchPicker.swift
// Description: Popover-based branch picker dropdown with search, create, and delete.
// Status: ✅ Completed

import { useState, useCallback, useRef } from 'react'

interface BranchInfo {
  name: string
  isCurrent: boolean
}

interface BranchPickerProps {
  currentBranch: string
  branches: BranchInfo[]
  isLoading: boolean
  onCreateBranch: (name: string) => Promise<void>
  onSwitchBranch: (name: string) => Promise<void>
  onDeleteBranch?: (name: string) => Promise<void>
}

export function BranchPicker({
  currentBranch,
  branches,
  isLoading,
  onCreateBranch,
  onSwitchBranch,
  onDeleteBranch,
}: BranchPickerProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        setSearch('')
        setShowCreate(false)
        setNewBranchName('')
      }
      return !prev
    })
  }, [])

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleSwitch = useCallback(
    async (name: string) => {
      setOpen(false)
      await onSwitchBranch(name)
    },
    [onSwitchBranch],
  )

  const handleCreate = useCallback(async () => {
    if (!newBranchName.trim()) return
    await onCreateBranch(newBranchName.trim())
    setShowCreate(false)
    setNewBranchName('')
    setOpen(false)
  }, [newBranchName, onCreateBranch])

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; branchName: string } | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent, branchName: string) => {
    if (branchName === currentBranch) return
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, branchName })
  }, [currentBranch])

  const handleDeleteBranch = useCallback(async () => {
    if (!contextMenu || !onDeleteBranch) return
    setOpen(false)
    setContextMenu(null)
    await onDeleteBranch(contextMenu.branchName)
  }, [contextMenu, onDeleteBranch])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          borderRadius: 5,
          border: '1px solid var(--nana-border)',
          background: 'var(--nana-surface)',
          color: 'var(--nana-fg)',
          fontSize: 10,
          fontWeight: 500,
          fontFamily: '"JetBrains Mono", monospace',
          cursor: 'pointer',
          height: 24,
        }}
        title="Branch picker"
      >
        <svg width={12} height={12} viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.6 }}>
          <path fillRule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
        </svg>
        {currentBranch || 'HEAD'}
        <span style={{ fontSize: 9, opacity: 0.5 }}>▾</span>
      </button>

      {open && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99,
            }}
            onClick={() => { setOpen(false); setContextMenu(null) }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              width: 300,
              maxHeight: 420,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--nana-bg)',
              border: '1px solid var(--nana-border)',
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              zIndex: 100,
            }}
          >
            {/* Search */}
            <div style={{ padding: 8 }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search branches..."
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--nana-border)',
                  background: 'var(--nana-surface)',
                  color: 'var(--nana-fg)',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
                autoFocus
              />
            </div>

            {/* Branch list */}
            <div style={{ flex: 1, overflow: 'auto', borderTop: '1px solid var(--nana-border)' }}>
              {isLoading && (
                <div style={{ padding: 8, fontSize: 12, color: 'var(--nana-fg-dim)', textAlign: 'center' }}>
                  Loading...
                </div>
              )}
              {filtered.map((branch) => (
                <button
                  key={branch.name}
                  onClick={() => void handleSwitch(branch.name)}
                  onContextMenu={(e) => handleContextMenu(e, branch.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0 10px',
                    width: '100%',
                    height: 40,
                    border: 'none',
                    background: branch.isCurrent ? 'var(--nana-accent-soft)' : 'transparent',
                    color: branch.isCurrent ? 'var(--nana-fg)' : 'var(--nana-fg-dim)',
                    fontSize: 12,
                    fontWeight: branch.isCurrent ? 600 : 500,
                    fontFamily: '"JetBrains Mono", monospace',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!branch.isCurrent) (e.currentTarget as HTMLElement).style.background = 'var(--nana-hover)'
                  }}
                  onMouseLeave={(e) => {
                    if (!branch.isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  {branch.isCurrent && (
                    <svg width={7} height={7} viewBox="0 0 8 8">
                      <circle cx={4} cy={4} r={4} fill="var(--nana-accent)" />
                    </svg>
                  )}
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {branch.name}
                  </span>
                  {branch.isCurrent && (
                    <svg width={12} height={12} viewBox="0 0 16 16" fill="var(--nana-accent)">
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                    </svg>
                  )}
                </button>
              ))}
              {!isLoading && filtered.length === 0 && (
                <div style={{ padding: 8, fontSize: 12, color: 'var(--nana-fg-dim)', textAlign: 'center' }}>
                  No branches match
                </div>
              )}
            </div>

            {/* New branch footer */}
            {!showCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  width: '100%',
                  border: 'none',
                  borderTop: '1px solid var(--nana-border)',
                  background: 'transparent',
                  color: 'var(--nana-fg-dim)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>+</span>
                New Branch
              </button>
            ) : (
              <div style={{ padding: 8, borderTop: '1px solid var(--nana-border)' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="branch-name"
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--nana-border)',
                      background: 'var(--nana-surface)',
                      color: 'var(--nana-fg)',
                      fontSize: 12,
                      fontFamily: '"JetBrains Mono", monospace',
                      outline: 'none',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleCreate()
                      if (e.key === 'Escape') {
                        setShowCreate(false)
                        setNewBranchName('')
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => void handleCreate()}
                    disabled={!newBranchName.trim()}
                    style={{
                      padding: '2px 10px',
                      borderRadius: 4,
                      border: '1px solid var(--nana-border)',
                      background: newBranchName.trim() ? 'var(--nana-accent)' : 'var(--nana-surface)',
                      color: newBranchName.trim() ? 'var(--nana-bg)' : 'var(--nana-fg-dim)',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      fontWeight: 600,
                      cursor: newBranchName.trim() ? 'pointer' : 'default',
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
          {contextMenu && onDeleteBranch && (
            <div
              style={{
                position: 'fixed',
                left: contextMenu.x,
                top: contextMenu.y,
                minWidth: 150,
                background: 'var(--nana-bg)',
                border: '1px solid var(--nana-border)',
                borderRadius: 6,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                zIndex: 200,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => void handleDeleteBranch()}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '7px 12px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--nana-diff-remove-fg, #e5534b)',
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--nana-hover)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                Delete Branch
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
