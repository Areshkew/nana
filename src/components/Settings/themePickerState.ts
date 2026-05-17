// Original: N/A — theme picker state management
// Description: Shared state for theme picker popover.
// Status: ✅ Completed

interface Anchor {
  x: number
  y: number
}

let themePickerAnchor: Anchor | null = null

export function setThemePickerAnchor(x: number, y: number): void {
  themePickerAnchor = { x, y }
}

export function getThemePickerAnchor(): Anchor | null {
  return themePickerAnchor
}

export function openThemePicker(): void {
  const el = document.getElementById('nana-theme-picker-trigger')
  if (el) el.click()
}
