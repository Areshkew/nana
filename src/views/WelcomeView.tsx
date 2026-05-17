// Original: Muxy/Views/WelcomeView.swift
// Description: Empty state shown when no project is selected.
// Status: ✅ Completed

export function WelcomeView(): JSX.Element {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <p className="text-sm text-[var(--nana-fg-dim)]">No project selected</p>
    </div>
  )
}
