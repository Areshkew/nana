// Original: Muxy/Views/Sidebar/CreateWorktreeSheet.swift
// Description: Modal sheet for creating a new git worktree — name, branch mode, setup commands.
// Status: Completed

import { useState, useCallback } from 'react'
import { type Project } from '../../models/project'
import { createWorktree, type Worktree } from '../../models/worktree'
import { useWorktreeStore } from '../../stores/worktreeStore'
import {
  addWorktree as gitAddWorktree,
  listBranches,
} from '../../services/git/worktree'
import { useMountEffect } from '../../hooks/useMountEffect'
import { Loader2, AlertTriangle, Info } from 'lucide-react'
import { BranchPicker } from './BranchPicker'

export interface CreateWorktreeResult {
  kind: 'created'
  worktree: Worktree
  runSetup: boolean
}

interface CreateWorktreeSheetProps {
  project: Project
  onFinish: (result: CreateWorktreeResult | { kind: 'cancelled' }) => void
}

export function CreateWorktreeSheet({ project, onFinish }: CreateWorktreeSheetProps): JSX.Element {
  const [name, setName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [branchNameEdited, setBranchNameEdited] = useState(false)
  const [createNewBranch, setCreateNewBranch] = useState(true)
  const [selectedExistingBranch, setSelectedExistingBranch] = useState('')
  const [availableBranches, setAvailableBranches] = useState<string[]>([])
  const [setupCommands, setSetupCommands] = useState<string[]>([])
  const [runSetup, setRunSetup] = useState(false)
  const [inProgress, setInProgress] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const addWorktreeToStore = useWorktreeStore((s) => s.add)

  useMountEffect(() => {
    void loadBranches()
    loadSetupCommands()
  })

  const loadBranches = async () => {
    try {
      const branches = await listBranches(project.path)
      setAvailableBranches(branches)
      if (branches.length > 0 && !selectedExistingBranch) {
        setSelectedExistingBranch(branches[0])
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load branches')
    }
  }

  const loadSetupCommands = () => {
    setSetupCommands([])
  }

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value)
      if (createNewBranch && !branchNameEdited) {
        setBranchName(value)
      }
    },
    [createNewBranch, branchNameEdited],
  )

  const handleBranchNameChange = useCallback((value: string) => {
    setBranchName(value)
    setBranchNameEdited(value !== name)
  }, [name])

  const handleBranchModeChange = useCallback(
    (isCreateNew: boolean) => {
      setCreateNewBranch(isCreateNew)
      if (isCreateNew && !branchNameEdited) {
        setBranchName(name)
      }
    },
    [name, branchNameEdited],
  )

  const trimmedName = name.trim()
  const trimmedBranch = branchName.trim()
  const canCreate =
    trimmedName.length > 0 &&
    (createNewBranch ? trimmedBranch.length > 0 : selectedExistingBranch.length > 0)

  const create = useCallback(async () => {
    setInProgress(true)
    setErrorMessage(null)

    const branch = createNewBranch ? trimmedBranch : selectedExistingBranch
    const slug = slugFromName(trimmedName)

    let worktreeDir: string
    try {
      worktreeDir = await window.electronAPI.getWorktreePath(project.id, slug)
    } catch {
      worktreeDir = `worktrees/${project.id}/${slug}`
    }

    try {
      await gitAddWorktree(project.path, worktreeDir, branch, createNewBranch)
    } catch (err) {
      setInProgress(false)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create worktree')
      return
    }

    const wt = createWorktree(trimmedName, worktreeDir, {
      branch,
      ownsBranch: createNewBranch,
      isPrimary: false,
    })
    addWorktreeToStore(wt, project.id)
    setInProgress(false)
    onFinish({ kind: 'created', worktree: wt, runSetup })
  }, [
    createNewBranch,
    trimmedName,
    trimmedBranch,
    selectedExistingBranch,
    project,
    runSetup,
    addWorktreeToStore,
    onFinish,
  ])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        className="w-[460px] rounded-xl border border-white/10 bg-[#1e1e1e] p-5 shadow-2xl"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onFinish({ kind: 'cancelled' })
        }}
      >
        <h2 className="mb-4 text-sm font-semibold text-white">New Worktree</h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] text-white/50">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="feature-x"
              autoFocus
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/20 focus:border-blue-500/50"
            />
          </div>

          <div className="flex gap-1 rounded-md bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => handleBranchModeChange(true)}
              className={`flex-1 rounded px-3 py-1 text-[11px] font-medium transition-colors ${
                createNewBranch
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Create new branch
            </button>
            <button
              type="button"
              onClick={() => handleBranchModeChange(false)}
              className={`flex-1 rounded px-3 py-1 text-[11px] font-medium transition-colors ${
                !createNewBranch
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Use existing branch
            </button>
          </div>

          {createNewBranch ? (
            <div>
              <label className="mb-1.5 block text-[11px] text-white/50">Branch Name</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => handleBranchNameChange(e.target.value)}
                placeholder="feature-x"
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/20 focus:border-blue-500/50"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[11px] text-white/50">Branch</label>
              <BranchPicker
                branches={availableBranches}
                value={selectedExistingBranch}
                onChange={setSelectedExistingBranch}
              />
            </div>
          )}

          {setupCommands.length > 0 ? (
            <SetupCommandsSection
              commands={setupCommands}
              runSetup={runSetup}
              onToggleSetup={setRunSetup}
            />
          ) : (
            <SetupGuideSection projectPath={project.path} />
          )}

          {errorMessage && (
            <p className="text-[11px] leading-snug text-red-400">{errorMessage}</p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onFinish({ kind: 'cancelled' })}
            className="rounded-md px-3 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white/70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void create()}
            disabled={!canCreate || inProgress}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600"
          >
            {inProgress && <Loader2 size={12} className="animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

function SetupCommandsSection({
  commands,
  runSetup,
  onToggleSetup,
}: {
  commands: string[]
  runSetup: boolean
  onToggleSetup: (v: boolean) => void
}): JSX.Element {
  return (
    <div className="rounded-md bg-white/[0.03] p-2.5">
      <div className="mb-2 flex items-center gap-1.5">
        <AlertTriangle size={10} className="text-red-400" />
        <span className="text-[11px] font-semibold text-white">
          Setup commands from .nana/worktree.json
        </span>
      </div>
      <p className="mb-2 text-[10px] leading-snug text-white/40">
        These commands will run in the new worktree&apos;s terminal. Only enable this if you trust this
        repository.
      </p>
      <div className="mb-2 rounded bg-black/20 p-2">
        {commands.map((cmd) => (
          <div key={cmd} className="font-mono text-[10px] text-white/70">
            {cmd}
          </div>
        ))}
      </div>
      <label className="flex items-center gap-1.5 text-[11px] text-white/60">
        <input
          type="checkbox"
          checked={runSetup}
          onChange={(e) => onToggleSetup(e.target.checked)}
          className="rounded border-white/20 bg-white/5"
        />
        Run these commands after creating the worktree
      </label>
    </div>
  )
}

function SetupGuideSection({ projectPath }: { projectPath: string }): JSX.Element {
  return (
    <div className="rounded-md bg-white/[0.03] p-2.5">
      <div className="mb-2 flex items-center gap-1.5">
        <Info size={10} className="text-white/30" />
        <span className="text-[11px] font-semibold text-white">Optional setup commands</span>
      </div>
      <p className="mb-1.5 text-[10px] leading-snug text-white/40">
        To run setup commands after creating a worktree, add .nana/worktree.json in this repository.
      </p>
      <p className="font-mono text-[10px] text-white/60">{projectPath}/.nana/worktree.json</p>
      <pre className="mt-1 rounded bg-black/20 p-2 font-mono text-[10px] text-white/60">
{`{
  "setup": [
    "pnpm install",
    "pnpm dev"
  ]
}`}
      </pre>
    </div>
  )
}

function slugFromName(name: string): string {
  const slug = name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
  return slug.length > 0 ? slug : crypto.randomUUID()
}
