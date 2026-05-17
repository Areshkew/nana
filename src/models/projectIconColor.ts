// Original: MuxyShared/ProjectIconColor.swift
// Description: 12-color palette for project icon colors with swatch lookup.
// Status: ✅ Completed

export interface ColorSwatch {
  readonly id: string
  readonly name: string
  readonly hex: string
}

export const PROJECT_ICON_PALETTE: readonly ColorSwatch[] = [
  { id: 'red', name: 'Red', hex: '#E5484D' },
  { id: 'orange', name: 'Orange', hex: '#F76B15' },
  { id: 'amber', name: 'Amber', hex: '#F5A623' },
  { id: 'yellow', name: 'Yellow', hex: '#EBCB00' },
  { id: 'lime', name: 'Lime', hex: '#9BCD1E' },
  { id: 'green', name: 'Green', hex: '#30A46C' },
  { id: 'teal', name: 'Teal', hex: '#12A594' },
  { id: 'cyan', name: 'Cyan', hex: '#05A2C2' },
  { id: 'blue', name: 'Blue', hex: '#3E63DD' },
  { id: 'indigo', name: 'Indigo', hex: '#5B5BD6' },
  { id: 'violet', name: 'Violet', hex: '#8E4EC6' },
  { id: 'pink', name: 'Pink', hex: '#D6409F' },
]

const byId: ReadonlyMap<string, ColorSwatch> = new Map(
  PROJECT_ICON_PALETTE.map((s) => [s.id, s]),
)

export function swatchForId(id: string | null | undefined): ColorSwatch | undefined {
  if (!id) return undefined
  return byId.get(id) ?? PROJECT_ICON_PALETTE.find((s) => s.hex.toLowerCase() === id.toLowerCase())
}

export function prefersDarkForeground(hex: string): boolean {
  const rgb = rgbFromHex(hex)
  if (!rgb) return false
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 0.6
}

function rgbFromHex(hex: string): [number, number, number] | null {
  let normalized = hex.trim()
  if (normalized.startsWith('#')) normalized = normalized.slice(1)
  if (normalized.length !== 6) return null
  const value = Number.parseInt(normalized, 16)
  if (Number.isNaN(value)) return null
  return [
    ((value >> 16) & 0xFF) / 255,
    ((value >> 8) & 0xFF) / 255,
    (value & 0xFF) / 255,
  ]
}
