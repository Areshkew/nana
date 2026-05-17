// Original: N/A — shared virtualization infrastructure
// Description: Core types for virtual list, tree flattening, and diff rendering
// Status: Completed

export interface VirtualItem<T = unknown> {
  index: number
  key: string
  data: T
  depth: number
  expanded: boolean
  height: number | null
}

export interface VirtualItemGroup<T = unknown> extends VirtualItem<T> {
  type: 'group'
  childCount: number
}

export interface VirtualItemLeaf<T = unknown> extends VirtualItem<T> {
  type: 'item'
}

export interface VirtualItemDivider {
  index: number
  key: string
  type: 'divider'
  data: { text: string }
}

export type VirtualRow<T = unknown> =
  | VirtualItemGroup<T>
  | VirtualItemLeaf<T>
  | VirtualItemDivider

export interface VirtualListConfig {
  overscan: number
  estimateSize: (index: number) => number
  getItemKey?: (index: number) => string | number
  onScrollEnd?: () => void
}
