// Original: Muxy/Views/Editor/EditorPane.swift (EditorBreadcrumb)
// Description: Breadcrumb bar showing relative file path, modified indicator, read-only lock, Ln/Col.
// Status: 🚧 In progress

import { useEditorStore } from '../../stores/editorStore'

interface EditorBreadcrumbProps {
  filePath: string
  projectPath: string
  tabId: string
}

export function EditorBreadcrumb({ filePath, projectPath, tabId }: EditorBreadcrumbProps): JSX.Element {
  const meta = useEditorStore((s) => s.getEditor(tabId))

  const relativePath = filePath.startsWith(projectPath)
    ? filePath.slice(projectPath.length).replace(/^[/\\]/, '')
    : filePath.split(/[/\\]/).pop() ?? filePath

  return (
    <div
      className="flex h-7 shrink-0 items-center gap-2 border-b border-[var(--nana-border)] px-3"
      style={{
        background: 'var(--nana-surface)',
        fontFamily: 'var(--nana-font-ui)',
        fontSize: 11,
        color: 'var(--nana-fg-muted)',
      }}
    >
      <span className="truncate" title={relativePath}>
        {relativePath}
      </span>
      {meta.isModified && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: 'var(--nana-accent)' }}
          title="Modified"
        />
      )}
      <span className="ml-auto shrink-0 tabular-nums" style={{ color: 'var(--nana-fg-dim)' }}>
        Ln {meta.cursorLine}, Col {meta.cursorColumn}
      </span>
    </div>
  )
}
