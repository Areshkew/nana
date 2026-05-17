// Original: Muxy/Views/Sidebar/CreateWorktreeSheet.swift (branch Picker section)
// Description: Custom dark-themed dropdown picker for selecting git branches.
// Status: Completed

import { useState, useRef, useCallback } from 'react'
import { useMountEffect } from '../../hooks/useMountEffect'
import { ChevronDown } from 'lucide-react'

interface BranchPickerProps {
  branches: string[]
  value: string
  onChange: (value: string) => void
}

export function BranchPicker({ branches, value, onChange }: BranchPickerProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useMountEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setFilter('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  })

  const filtered = branches.filter((b) =>
    b.toLowerCase().includes(filter.toLowerCase()),
  )

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      if (next) {
        setFilter('')
        setTimeout(() => inputRef.current?.focus(), 0)
      }
      return next
    })
  }, [])

  const select = useCallback(
    (branch: string) => {
      onChange(branch)
      setOpen(false)
      setFilter('')
    },
    [onChange],
  )

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none hover:border-white/20 focus:border-blue-500/50"
      >
        <span className={value ? 'text-white' : 'text-white/20'}>
          {value || 'Select branch...'}
        </span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-white/30 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#1e1e1e] shadow-xl">
          <div className="border-b border-white/5 p-1.5">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter branches..."
              className="w-full rounded bg-white/5 px-2 py-1 text-[11px] text-white outline-none placeholder:text-white/20"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto overscroll-contain py-0.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-white/25">No branches found</div>
            ) : (
              filtered.map((branch) => (
                <button
                  key={branch}
                  type="button"
                  onClick={() => select(branch)}
                  className={`flex w-full items-center px-3 py-1.5 text-left text-[11px] transition-colors ${
                    branch === value
                      ? 'bg-blue-500/15 text-blue-300'
                      : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  <span className="truncate font-mono">{branch}</span>
                  {branch === value && (
                    <span className="ml-auto text-[10px] text-blue-400">&#10003;</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
