// Original: Muxy/Views/Sidebar.swift
// Description: Collapsible sidebar with project DnD reordering and expanded mode with worktree list.
// Status: Completed

import { useState, useRef, useCallback } from 'react'
import { useProjectStore, addProjectFromDialog } from '../stores/projectStore'
import { useAppStore } from '../stores/appStore'
import { useSidebarStore } from '../stores/sidebarStore'
import { ProjectRow } from '../components/Sidebar/ProjectRow'
import { ExpandedProjectRow } from '../components/Sidebar/ExpandedProjectRow'
import { CreateWorktreeSheet, type CreateWorktreeResult } from '../components/Sidebar/CreateWorktreeSheet'
import { useMountEffect } from '../hooks/useMountEffect'
import {
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  MessageSquare,
  Bell,
  Palette,
} from 'lucide-react'
import { type Project } from '../models/project'

const COLLAPSED_WIDTH = 44
const DRAG_ACTIVATION_DISTANCE = 6

interface ProjectDragState {
  draggedID: string | null
  didSelect: boolean
  pointerDownFired: boolean
  startY: number
  lastTargetProjectID: string | null
}

const initialDragState: ProjectDragState = {
  draggedID: null,
  didSelect: false,
  pointerDownFired: false,
  startY: 0,
  lastTargetProjectID: null,
}

function getProjectIdAtY(clientY: number, listEl: HTMLElement, projects: Project[]): string | null {
  const children = listEl.children
  const count = Math.min(children.length, projects.length)
  for (let i = 0; i < count; i++) {
    const rect = children[i].getBoundingClientRect()
    if (clientY >= rect.top && clientY <= rect.bottom) return projects[i].id
  }
  return null
}

interface SidebarProps {
  onOpenThemePicker: (tab?: string) => void
}

export function Sidebar({ onOpenThemePicker }: SidebarProps): JSX.Element {
  const projects = useProjectStore((s) => s.projects)
  const loaded = useProjectStore((s) => s.loaded)
  const activeProjectID = useAppStore((s) => s.activeProjectID)
  const selectProject = useAppStore((s) => s.selectProject)
  const removeProject = useAppStore((s) => s.removeProject)
  const loadProjects = useProjectStore((s) => s.load)
  const removeProjectStore = useProjectStore((s) => s.removeProject)
  const renameProject = useProjectStore((s) => s.renameProject)
  const reorderProjects = useProjectStore((s) => s.reorder)

  const isExpanded = useSidebarStore((s) => s.isExpanded)
  const width = useSidebarStore((s) => s.width)
  const toggle = useSidebarStore((s) => s.toggle)
  const setWidth = useSidebarStore((s) => s.setWidth)
  const commitWidth = useSidebarStore((s) => s.commitWidth)

  const [worktreeSheetProject, setWorktreeSheetProject] = useState<Project | null>(null)
  const [dragRender, setDragRender] = useState<{ draggedID: string | null }>({ draggedID: null })

  const dragRef = useRef<ProjectDragState>({ ...initialDragState })

  const handleNewWorktree = useCallback((project: { id: string }) => {
    const found = projects.find((p) => p.id === project.id)
    if (found) setWorktreeSheetProject(found)
  }, [projects])

  const handleWorktreeSheetFinish = useCallback(
    (result: CreateWorktreeResult | { kind: 'cancelled' }) => {
      if (result.kind === 'created') {
        const wt = result.worktree
        const project = worktreeSheetProject
        if (project) {
          useAppStore.getState().selectProject(project, wt)
        }
      }
      setWorktreeSheetProject(null)
    },
    [worktreeSheetProject],
  )

  useMountEffect(() => {
    void loadProjects()
  })

  const handleSelect = useCallback((projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    selectProject(project)
  }, [projects, selectProject])

  const handleRemove = async (projectId: string) => {
    removeProject(projectId)
    await removeProjectStore(projectId)
  }

  const handlePointerDown = useCallback(
    (_project: Project) => (e: React.PointerEvent) => {
      if (e.button !== 0) return
      const target = (e.target as HTMLElement).closest('button, input, [role="button"], a, select, textarea')
      if (target) return
      e.preventDefault()
      const captureTarget = e.currentTarget as HTMLElement
      captureTarget.setPointerCapture(e.pointerId)
      dragRef.current = {
        draggedID: null,
        didSelect: false,
        pointerDownFired: true,
        startY: e.clientY,
        lastTargetProjectID: null,
      }
      setDragRender({ draggedID: null })
    },
    [],
  )

  const handlePointerMove = useCallback(
    (project: Project, listEl: HTMLElement | null) => (e: React.PointerEvent) => {
      if (e.buttons !== 1) return
      const d = dragRef.current
      if (!d.pointerDownFired) return
      const dy = Math.abs(e.clientY - d.startY)

      if (!d.didSelect) {
        handleSelect(project.id)
        dragRef.current = { ...d, didSelect: true }
      }

      if (d.draggedID === null) {
        if (dy < DRAG_ACTIVATION_DISTANCE) return
        dragRef.current = { ...dragRef.current, draggedID: project.id }
        setDragRender({ draggedID: project.id })
        return
      }

      if (!listEl) return

      const currentProjects = useProjectStore.getState().projects
      const targetProjectID = getProjectIdAtY(e.clientY, listEl, currentProjects)
      if (!targetProjectID || targetProjectID === d.draggedID) return
      if (d.lastTargetProjectID === targetProjectID) return

      const sourceIndex = currentProjects.findIndex((p) => p.id === d.draggedID)
      const destIndex = currentProjects.findIndex((p) => p.id === targetProjectID)
      if (sourceIndex === -1 || destIndex === -1) return

      dragRef.current = { ...dragRef.current, lastTargetProjectID: targetProjectID }
      const offset = destIndex > sourceIndex ? destIndex + 1 : destIndex
      void reorderProjects(sourceIndex, offset)
    },
    [handleSelect, reorderProjects],
  )

  const handlePointerUp = useCallback(
    (project: Project) => (e: React.PointerEvent) => {
      if (e.button !== 0) return
      const target = e.currentTarget as HTMLElement
      target.releasePointerCapture(e.pointerId)

      const d = dragRef.current
      if (!d.didSelect) {
        handleSelect(project.id)
      }

      dragRef.current = { ...initialDragState }
      setDragRender({ draggedID: null })
    },
    [handleSelect],
  )

  const currentWidth = isExpanded ? width : COLLAPSED_WIDTH

  return (
    <div className="flex h-full shrink-0">
      <div
        className="flex h-full flex-col border-r border-[var(--nana-border)] bg-[var(--nana-bg)]"
        style={{ width: currentWidth }}
      >
        <div
          className="flex-1 overflow-y-auto py-1"
          ref={(el) => { listRef.current = el }}
          style={{ userSelect: dragRender.draggedID ? 'none' : undefined }}
        >
          {loaded &&
            projects.map((project) =>
              isExpanded ? (
                <div
                  key={project.id}
                  style={{ opacity: dragRender.draggedID === project.id ? 0.5 : 1, transition: 'opacity 0.15s ease' }}
                  onPointerDown={handlePointerDown(project)}
                  onPointerMove={handlePointerMove(project, listRef.current)}
                  onPointerUp={handlePointerUp(project)}
                >
                  <ExpandedProjectRow
                    project={project}
                    isActive={project.id === activeProjectID}
                    onSelect={() => handleSelect(project.id)}
                    onRemove={() => void handleRemove(project.id)}
                    onRename={(name) => void renameProject(project.id, name)}
                    onNewWorktree={handleNewWorktree}
                  />
                </div>
              ) : (
                <div
                  key={project.id}
                  style={{ opacity: dragRender.draggedID === project.id ? 0.5 : 1, transition: 'opacity 0.15s ease' }}
                  onPointerDown={handlePointerDown(project)}
                  onPointerMove={handlePointerMove(project, listRef.current)}
                  onPointerUp={handlePointerUp(project)}
                >
                  <ProjectRow
                    project={project}
                    shortcutIndex={projects.indexOf(project) < 9 ? projects.indexOf(project) + 1 : null}
                    isActive={project.id === activeProjectID}
                    onSelect={() => handleSelect(project.id)}
                    onRemove={() => void handleRemove(project.id)}
                    onRename={(name) => void renameProject(project.id, name)}
                  />
                </div>
              ),
            )}

          {/* Add Project button — last item in scrollable list, matching original Swift */}
          {isExpanded ? (
            <button
              type="button"
              onClick={() => void addProjectFromDialog()}
              className="mx-1.5 flex w-[calc(100%-12px)] items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-blue-400"
              title="Add Project"
              aria-label="Add Project"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--nana-surface)]">
                <Plus size={11} />
              </div>
              <span>Add Project</span>
            </button>
          ) : (
            <div className="flex items-center justify-center py-1">
              <button
                type="button"
                onClick={() => void addProjectFromDialog()}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--nana-surface)] text-[var(--nana-fg-dim)] transition-colors hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg-muted)]"
                title="Add Project"
                aria-label="Add Project"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Footer — matches original SidebarFooter layout */}
        <div className={`flex items-center justify-center gap-1 py-2 ${isExpanded ? 'px-2.5' : 'flex-col'}`}>
          {isExpanded ? (
            <>
              <button
                type="button"
                onClick={toggle}
                className="flex h-6 w-6 items-center justify-center rounded text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg-muted)]"
                title="Collapse Sidebar (Ctrl+B)"
                aria-label="Collapse Sidebar"
              >
                <PanelLeftClose size={14} />
              </button>
              <div className="flex-1" />
              <FooterIconButton icon={Zap} label="AI Usage" disabled />
              <FooterIconButton icon={MessageSquare} label="Chats" disabled />
              <FooterIconButton icon={Bell} label="Notifications" disabled />
              <FooterIconButton icon={Palette} label="Theme Picker" onClick={() => onOpenThemePicker('appearance')} />
            </>
          ) : (
            <>
              <FooterIconButton icon={Zap} label="AI Usage" disabled />
              <FooterIconButton icon={MessageSquare} label="Chats" disabled />
              <FooterIconButton icon={Bell} label="Notifications" disabled />
              <FooterIconButton icon={Palette} label="Theme Picker" onClick={() => onOpenThemePicker('appearance')} />
              <button
                type="button"
                onClick={toggle}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--nana-fg-dim)] transition-colors hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg-muted)]"
                title="Expand Sidebar (Ctrl+B)"
                aria-label="Expand Sidebar"
              >
                <PanelLeftOpen size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {isExpanded && (
        <ResizeHandle width={width} onWidthChange={setWidth} onCommit={commitWidth} />
      )}

      {worktreeSheetProject && (
        <CreateWorktreeSheet
          project={worktreeSheetProject}
          onFinish={handleWorktreeSheetFinish}
        />
      )}
    </div>
  )
}

const listRef = { current: (null as HTMLElement | null) }

function FooterIconButton({
  icon: Icon,
  label,
  disabled = false,
  onClick,
}: {
  icon: React.ElementType<{ size?: number | string; className?: string }>
  label: string
  disabled?: boolean
  onClick?: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-[var(--nana-fg-dim)] hover:bg-[var(--nana-hover)] hover:text-[var(--nana-fg-muted)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--nana-fg-dim)]"
      title={label}
      aria-label={label}
    >
      <Icon size={14} />
    </button>
  )
}

function ResizeHandle({ width, onWidthChange, onCommit }: { width: number; onWidthChange: (w: number) => void; onCommit: () => void }): JSX.Element {
  const anchorRef = useRef<number | null>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)

  useMountEffect(() => {
    return () => {
      dragCleanupRef.current?.()
    }
  })

  return (
    <div
      className="h-full w-[5px] shrink-0 cursor-col-resize hover:bg-[var(--nana-hover)]"
      onMouseDown={(e) => {
        anchorRef.current = width
        const startX = e.clientX
        let raf = 0

        function onMouseMove(ev: MouseEvent) {
          if (anchorRef.current === null) return
          const proposed = anchorRef.current + (ev.clientX - startX)
          cancelAnimationFrame(raf)
          raf = requestAnimationFrame(() => {
            onWidthChange(proposed)
          })
        }

        function onMouseUp() {
          cancelAnimationFrame(raf)
          anchorRef.current = null
          dragCleanupRef.current = null
          onCommit()
          document.removeEventListener('mousemove', onMouseMove)
          document.removeEventListener('mouseup', onMouseUp)
        }

        const cleanup = (): void => {
          cancelAnimationFrame(raf)
          anchorRef.current = null
          dragCleanupRef.current = null
          document.removeEventListener('mousemove', onMouseMove)
          document.removeEventListener('mouseup', onMouseUp)
        }

        dragCleanupRef.current = cleanup
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
      }}
      aria-hidden="true"
    />
  )
}
