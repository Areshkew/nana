// Original: Muxy/Services/ProjectPersistence.swift + WorktreePersistence.swift + WorkspacePersistence.swift
// Description: Renderer-side persistence service wrapping IPC bridge.
// Status: Completed

import { projectSchema, type Project } from '../models/project'
import { worktreeSchema, type Worktree } from '../models/worktree'
import { type WorkspaceSnapshot } from '../models/workspaceSnapshot'

export async function loadProjects(): Promise<Project[]> {
  const raw = await window.electronAPI.loadProjects()
  if (!Array.isArray(raw)) return []
  const parsed = raw
    .map((item) => {
      const result = projectSchema.safeParse(item)
      return result.success ? result.data : null
    })
    .filter((p): p is Project => p !== null)
  return parsed
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await window.electronAPI.saveProjects(projects)
}

export async function loadWorktrees(projectID: string): Promise<Worktree[]> {
  const raw = await window.electronAPI.loadWorktrees(projectID)
  if (!Array.isArray(raw)) return []
  const parsed = raw
    .map((item) => {
      const result = worktreeSchema.safeParse(item)
      return result.success ? result.data : null
    })
    .filter((w): w is Worktree => w !== null)
  return parsed
}

export async function saveWorktrees(projectID: string, worktrees: Worktree[]): Promise<void> {
  await window.electronAPI.saveWorktrees(projectID, worktrees)
}

export async function removeWorktrees(projectID: string): Promise<void> {
  await window.electronAPI.removeWorktrees(projectID)
}

export async function loadWorkspaces(): Promise<WorkspaceSnapshot[]> {
  const raw = await window.electronAPI.loadWorkspaces()
  if (!Array.isArray(raw)) return []
  return raw as WorkspaceSnapshot[]
}

export async function saveWorkspaces(snapshots: WorkspaceSnapshot[]): Promise<void> {
  await window.electronAPI.saveWorkspaces(snapshots)
}

export interface SelectionData {
  activeProjectID: string | null
  activeWorktreeIDs: Record<string, string>
}

export async function loadSelection(): Promise<SelectionData> {
  const raw = await window.electronAPI.loadSelection()
  if (typeof raw !== 'object' || raw === null) {
    return { activeProjectID: null, activeWorktreeIDs: {} }
  }
  const data = raw as Record<string, unknown>
  return {
    activeProjectID: typeof data.activeProjectID === 'string' ? data.activeProjectID : null,
    activeWorktreeIDs:
      typeof data.activeWorktreeIDs === 'object' && data.activeWorktreeIDs !== null
        ? data.activeWorktreeIDs as Record<string, string>
        : {},
  }
}

export async function saveSelection(data: SelectionData): Promise<void> {
  await window.electronAPI.saveSelection(data as unknown as Record<string, unknown>)
}

export function openDirectory(): Promise<string | null> {
  return window.electronAPI.openDirectory()
}

export async function setWindowTitle(title: string): Promise<void> {
  await window.electronAPI.setTitle(title)
}

export interface SettingsData {
  keepOpenWhenNoTabs: boolean
  confirmCloseRunningProcess: boolean
  autoExpandWorktreesOnProjectSwitch: boolean
  windowTransparency: number
  vcsDisplayMode: string
  defaultEditor: string
  externalEditorCommand: string
  editorFontFamily: string
  editorFontSize: number
  themeName: string | null
}

const defaultSettings: SettingsData = {
  keepOpenWhenNoTabs: false,
  confirmCloseRunningProcess: true,
  autoExpandWorktreesOnProjectSwitch: true,
  windowTransparency: 1.0,
  vcsDisplayMode: 'attached',
  defaultEditor: 'builtin',
  externalEditorCommand: 'vim',
  editorFontFamily: 'JetBrains Mono',
  editorFontSize: 13,
  themeName: null,
}

function readBool(data: Record<string, unknown>, key: string, fallback: boolean): boolean {
  return typeof data[key] === 'boolean' ? data[key] : fallback
}

function readNumber(data: Record<string, unknown>, key: string, fallback: number): number {
  return typeof data[key] === 'number' ? data[key] : fallback
}

function readString(data: Record<string, unknown>, key: string, fallback: string): string {
  return typeof data[key] === 'string' ? data[key] : fallback
}

function readNullableString(data: Record<string, unknown>, key: string): string | null {
  const val = data[key]
  return typeof val === 'string' ? val : null
}

export async function loadSettings(): Promise<SettingsData> {
  const raw = await window.electronAPI.loadSettings()
  if (typeof raw !== 'object' || raw === null) return { ...defaultSettings }
  const data = raw as Record<string, unknown>
  return {
    keepOpenWhenNoTabs: readBool(data, 'keepOpenWhenNoTabs', defaultSettings.keepOpenWhenNoTabs),
    confirmCloseRunningProcess: readBool(data, 'confirmCloseRunningProcess', defaultSettings.confirmCloseRunningProcess),
    autoExpandWorktreesOnProjectSwitch: readBool(data, 'autoExpandWorktreesOnProjectSwitch', defaultSettings.autoExpandWorktreesOnProjectSwitch),
    windowTransparency: readNumber(data, 'windowTransparency', defaultSettings.windowTransparency),
    vcsDisplayMode: readString(data, 'vcsDisplayMode', defaultSettings.vcsDisplayMode),
    defaultEditor: readString(data, 'defaultEditor', defaultSettings.defaultEditor),
    externalEditorCommand: readString(data, 'externalEditorCommand', defaultSettings.externalEditorCommand),
    editorFontFamily: readString(data, 'editorFontFamily', defaultSettings.editorFontFamily),
    editorFontSize: readNumber(data, 'editorFontSize', defaultSettings.editorFontSize),
    themeName: readNullableString(data, 'themeName') ?? defaultSettings.themeName,
  }
}

export async function saveSettings(data: SettingsData): Promise<void> {
  await window.electronAPI.saveSettings(data as unknown as Record<string, unknown>)
}
