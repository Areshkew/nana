// Original: N/A — project infrastructure
// Description: 3-action modal for adding a project (init / proceed / cancel).
// Reuses card shell from CreateWorktreeSheet. Prevents xterm.js focus theft.
// Status: ✅ Completed

import { useAddProjectDialogStore } from '../stores/addProjectDialogStore'
import { GitBranch, AlertTriangle, FolderGit } from 'lucide-react'
import { focusActiveTerminal } from '../services/terminalFocus'

export function AddProjectDialog(): JSX.Element | null {
  const open = useAddProjectDialogStore((s) => s.open)
  const options = useAddProjectDialogStore((s) => s.options)
  const close = useAddProjectDialogStore((s) => s.close)

  if (!open || !options) return null

  const handleResult = (result: 'init' | 'proceed' | null) => {
    close(result)
    focusActiveTerminal()
  }

  const hasNested = options.nestedRepos.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleResult(null)
      }}
    >
      <div
        className="w-[400px] rounded-xl border border-white/10 bg-[#1e1e1e] p-5 shadow-2xl"
        onKeyDown={(e) => {
          if (e.key === 'Escape') handleResult(null)
        }}
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
            {options.showInitAction ? (
              <GitBranch size={16} className="text-amber-400" />
            ) : (
              <AlertTriangle size={16} className="text-amber-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{options.title}</h3>
            <p className="mt-1 text-[11px] leading-snug text-white/50">{options.message}</p>
          </div>
        </div>

        {hasNested && (
          <div className="mb-4 rounded-md bg-amber-500/5 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <FolderGit size={12} className="text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-400">
                Nested {options.nestedRepos.length === 1 ? 'repository' : 'repositories'} found
              </span>
            </div>
            <p className="text-[10px] leading-snug text-white/40">
              {options.nestedRepos.join(', ')}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => handleResult(null)}
            className="rounded-md px-3 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white/70"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleResult('proceed')}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20"
          >
            {options.showInitAction ? 'Proceed Without Git' : 'Proceed'}
          </button>

          {options.showInitAction && (
            <button
              type="button"
              onClick={() => handleResult('init')}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500"
            >
              Initialize Git Repository
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
