// Original: Muxy/Views/VCS/UnifiedDiffView.swift — LazyVStack of diff chunks
// Description: Inline diff view that fetches cached diff rows from the VCS store
//              and renders them via DiffBodyView. Triggers lazy loading on mount.
// Status: ✅ Completed

import { useMountEffect } from '../../hooks/useMountEffect'
import { DiffBodyView } from './DiffBodyView'
import { useVCSStore } from '../../stores/vcsStore'
import { useThemeStore } from '../../stores/themeStore'

interface InlineDiffViewProps {
  repoPath: string
  filePath: string
  isStaged: boolean
}

export function InlineDiffView({
  repoPath,
  filePath,
  isStaged,
}: InlineDiffViewProps): JSX.Element {
  const theme = useThemeStore((s) => s.snapshot)
  const diff = useVCSStore((s) => s.getCachedDiff(repoPath, filePath))
  const loading = useVCSStore((s) => s.isLoadingDiff(repoPath, filePath))
  const error = useVCSStore((s) => s.getDiffError(repoPath, filePath)) ?? null
  const mode = useVCSStore((s) => s.mode)
  const loadDiff = useVCSStore((s) => s.loadDiff)

  useMountEffect(() => {
    if (!diff && !loading) {
      void loadDiff(repoPath, filePath, isStaged)
    }
  })

  if (!theme) return <></>

  return (
    <div style={{ height: 300 }}>
      <DiffBodyView
        isLoading={loading}
        error={error}
        rows={diff?.rows ?? null}
        filePath={filePath}
        mode={mode}
        theme={theme}
      />
    </div>
  )
}
