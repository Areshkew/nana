// Original: Muxy/Views/Sidebar/ProjectIconColorPicker.swift
// Description: Grid picker for project icon color with 12 swatches and reset.
// Status: ✅ Completed

import { PROJECT_ICON_PALETTE, swatchForId, prefersDarkForeground } from '../../models/projectIconColor'
import { RotateCcw } from 'lucide-react'

interface ProjectIconColorPickerProps {
  selectedID: string | null
  onSelect: (id: string | null) => void
  anchorX: number
  anchorY: number
}

export function ProjectIconColorPicker({
  selectedID,
  onSelect,
  anchorX,
  anchorY,
}: ProjectIconColorPickerProps): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => onSelect(selectedID)} />
      <div
        className="fixed z-50 rounded-lg border border-white/10 bg-[#1e1e1e] p-3 shadow-xl"
        style={{ left: anchorX, top: anchorY }}
      >
        <div className="mb-2 text-[11px] font-semibold text-white/40">Icon Color</div>
        <div className="grid grid-cols-6 gap-2">
          {PROJECT_ICON_PALETTE.map((swatch) => {
            const isSelected = swatchForId(selectedID)?.id === swatch.id
            const fg = prefersDarkForeground(swatch.hex) ? '#000' : '#fff'
            return (
              <button
                key={swatch.id}
                type="button"
                onClick={() => onSelect(swatch.id)}
                className="flex h-6 w-6 items-center justify-center"
                title={swatch.name}
                aria-label={swatch.name}
              >
                <div
                  className="h-[22px] w-[22px] rounded-full"
                  style={{ backgroundColor: swatch.hex }}
                />
                {isSelected && (
                  <div
                    className="absolute h-[18px] w-[18px] rounded-full"
                    style={{
                      border: `2px solid ${fg}`,
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
        <div className="my-2 border-t border-white/8" />
        <button
          type="button"
          onClick={() => onSelect(null)}
          disabled={selectedID === null}
          className={`flex items-center gap-1.5 text-[11px] font-medium ${
            selectedID === null ? 'text-white/20' : 'text-white/50 hover:text-white/70'
          }`}
        >
          <RotateCcw size={10} />
          Reset to Default
        </button>
      </div>
    </>
  )
}
