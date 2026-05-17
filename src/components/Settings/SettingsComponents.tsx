// Original: Muxy/Views/Settings/SettingsComponents.swift
// Description: Reusable settings UI primitives matching original SettingsMetrics constants.
// Status: ✅ Completed

import type { ReactNode } from 'react'

const METRICS = {
  horizontalPadding: 12,
  verticalPadding: 12,
  rowVerticalPadding: 6,
  sectionHeaderTopPadding: 10,
  sectionHeaderBottomPadding: 4,
  sectionFooterTopPadding: 6,
  sectionFooterBottomPadding: 10,
  labelFontSize: 'text-xs',
  footnoteFontSize: 'text-[11px]',
  controlWidth: 210,
} as const

export { METRICS }

export function SettingsContainer({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col overflow-y-auto">
      {children}
      <div className="min-h-0 shrink" />
    </div>
  )
}

export function SettingsSection({
  title,
  footer,
  showsDivider = true,
  children,
}: {
  title: string
  footer?: string
  showsDivider?: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <div className="flex flex-col">
      <div
        className={`${METRICS.footnoteFontSize} font-semibold text-[var(--nana-fg-dim)]`}
        style={{
          paddingLeft: METRICS.horizontalPadding,
          paddingRight: METRICS.horizontalPadding,
          paddingTop: METRICS.sectionHeaderTopPadding,
          paddingBottom: METRICS.sectionHeaderBottomPadding,
        }}
      >
        {title}
      </div>

      {children}

      {footer && (
        <div
          className={`${METRICS.footnoteFontSize} whitespace-pre-line text-[var(--nana-fg-dim)]`}
          style={{
            paddingLeft: METRICS.horizontalPadding,
            paddingRight: METRICS.horizontalPadding,
            paddingTop: METRICS.sectionFooterTopPadding,
            paddingBottom: METRICS.sectionFooterBottomPadding,
          }}
        >
          {footer}
        </div>
      )}

      {showsDivider && (
        <div
          className="border-t border-[var(--nana-border)]"
          style={{
            marginLeft: METRICS.horizontalPadding,
            marginRight: METRICS.horizontalPadding,
          }}
        />
      )}
    </div>
  )
}

export function SettingsRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): JSX.Element {
  return (
    <div
      className="flex items-center"
      style={{
        paddingLeft: METRICS.horizontalPadding,
        paddingRight: METRICS.horizontalPadding,
        paddingTop: METRICS.rowVerticalPadding,
        paddingBottom: METRICS.rowVerticalPadding,
      }}
    >
      <span className={`${METRICS.labelFontSize} text-[var(--nana-fg)]`}>{label}</span>
      <div className="ml-auto">{children}</div>
    </div>
  )
}

export function SettingsToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}): JSX.Element {
  return (
    <SettingsRow label={label}>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-4 w-7 rounded-full transition-colors ${
          value ? 'bg-blue-500' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
            value ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </button>
    </SettingsRow>
  )
}
