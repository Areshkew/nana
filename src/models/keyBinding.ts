// Original: Muxy/Models/KeyBinding.swift
// Description: 46 shortcut actions with metadata, default bindings, and categories.
// Status: ✅ Completed

import {
  type KeyCombo,
  ModifierFlags,
  ARROW_KEYS,
  primaryModifier,
} from './keyCombo'

export type ShortcutCategory =
  | 'Tabs'
  | 'Panes'
  | 'Tab Navigation'
  | 'Project Navigation'
  | 'Navigation'
  | 'Terminal'
  | 'Editor'
  | 'App'

export interface ShortcutActionDef {
  readonly id: string
  readonly displayName: string
  readonly category: ShortcutCategory
  readonly scope: 'global' | 'mainWindow'
}

function sa(
  id: string,
  displayName: string,
  category: ShortcutCategory,
  scope: 'global' | 'mainWindow' = 'mainWindow',
): ShortcutActionDef {
  return { id, displayName, category, scope }
}

const actions: ShortcutActionDef[] = [
  sa('newTab', 'New Tab', 'Tabs'),
  sa('closeTab', 'Close Tab', 'Tabs'),
  sa('renameTab', 'Rename Tab', 'Tabs'),
  sa('pinUnpinTab', 'Pin/Unpin Tab', 'Tabs'),
  sa('splitRight', 'Split Right', 'Panes'),
  sa('splitDown', 'Split Down', 'Panes'),
  sa('closePane', 'Close Pane', 'Panes'),
  sa('focusPaneLeft', 'Focus Pane Left', 'Panes'),
  sa('focusPaneRight', 'Focus Pane Right', 'Panes'),
  sa('focusPaneUp', 'Focus Pane Up', 'Panes'),
  sa('focusPaneDown', 'Focus Pane Down', 'Panes'),
  sa('nextTab', 'Next Tab', 'Tab Navigation'),
  sa('previousTab', 'Previous Tab', 'Tab Navigation'),
  sa('selectTab1', 'Tab 1', 'Tab Navigation'),
  sa('selectTab2', 'Tab 2', 'Tab Navigation'),
  sa('selectTab3', 'Tab 3', 'Tab Navigation'),
  sa('selectTab4', 'Tab 4', 'Tab Navigation'),
  sa('selectTab5', 'Tab 5', 'Tab Navigation'),
  sa('selectTab6', 'Tab 6', 'Tab Navigation'),
  sa('selectTab7', 'Tab 7', 'Tab Navigation'),
  sa('selectTab8', 'Tab 8', 'Tab Navigation'),
  sa('selectTab9', 'Tab 9', 'Tab Navigation'),
  sa('nextProject', 'Next Project', 'Project Navigation'),
  sa('previousProject', 'Previous Project', 'Project Navigation'),
  sa('selectProject1', 'Project 1', 'Project Navigation'),
  sa('selectProject2', 'Project 2', 'Project Navigation'),
  sa('selectProject3', 'Project 3', 'Project Navigation'),
  sa('selectProject4', 'Project 4', 'Project Navigation'),
  sa('selectProject5', 'Project 5', 'Project Navigation'),
  sa('selectProject6', 'Project 6', 'Project Navigation'),
  sa('selectProject7', 'Project 7', 'Project Navigation'),
  sa('selectProject8', 'Project 8', 'Project Navigation'),
  sa('selectProject9', 'Project 9', 'Project Navigation'),
  sa('findInTerminal', 'Find', 'Terminal'),
  sa('openVCSTab', 'Source Control', 'App'),
  sa('quickOpen', 'Quick Open', 'App'),
  sa('switchWorktree', 'Switch Worktree', 'Project Navigation'),
  sa('saveFile', 'Save File', 'Editor'),
  sa('toggleSidebar', 'Toggle Sidebar', 'App'),
  sa('toggleFileTree', 'Toggle File Tree', 'App'),
  sa('toggleAIUsage', 'Toggle AI Usage', 'App'),
  sa('navigateBack', 'Navigate Back', 'Navigation'),
  sa('navigateForward', 'Navigate Forward', 'Navigation'),
  sa('toggleThemePicker', 'Theme Picker', 'App'),
  sa('newProject', 'New Project', 'App'),
  sa('openProject', 'Open Project', 'App'),
  sa('reloadConfig', 'Reload Configuration', 'App', 'global'),
]

const actionsById = new Map(actions.map((a) => [a.id, a]))

export const ShortcutAction = {
  all: actions,
  forId(id: string): ShortcutActionDef | undefined {
    return actionsById.get(id)
  },
  allForCategory(category: ShortcutCategory): ShortcutActionDef[] {
    return actions.filter((a) => a.category === category)
  },
  tabActionForIndex(index: number): ShortcutActionDef | undefined {
    if (index >= 1 && index <= 9) return actions.find((a) => a.id === `selectTab${index}`)
    return undefined
  },
  projectActionForIndex(index: number): ShortcutActionDef | undefined {
    if (index >= 1 && index <= 9) return actions.find((a) => a.id === `selectProject${index}`)
    return undefined
  },
  categories: [
    'Tabs', 'Panes', 'Tab Navigation', 'Project Navigation',
    'Navigation', 'Terminal', 'Editor', 'App',
  ] as ShortcutCategory[],

  NewTab: actionsById.get('newTab')!,
  CloseTab: actionsById.get('closeTab')!,
  RenameTab: actionsById.get('renameTab')!,
  PinUnpinTab: actionsById.get('pinUnpinTab')!,
  SplitRight: actionsById.get('splitRight')!,
  SplitDown: actionsById.get('splitDown')!,
  ClosePane: actionsById.get('closePane')!,
  FocusPaneLeft: actionsById.get('focusPaneLeft')!,
  FocusPaneRight: actionsById.get('focusPaneRight')!,
  FocusPaneUp: actionsById.get('focusPaneUp')!,
  FocusPaneDown: actionsById.get('focusPaneDown')!,
  NextTab: actionsById.get('nextTab')!,
  PreviousTab: actionsById.get('previousTab')!,
  SelectTab1: actionsById.get('selectTab1')!,
  SelectTab2: actionsById.get('selectTab2')!,
  SelectTab3: actionsById.get('selectTab3')!,
  SelectTab4: actionsById.get('selectTab4')!,
  SelectTab5: actionsById.get('selectTab5')!,
  SelectTab6: actionsById.get('selectTab6')!,
  SelectTab7: actionsById.get('selectTab7')!,
  SelectTab8: actionsById.get('selectTab8')!,
  SelectTab9: actionsById.get('selectTab9')!,
  NextProject: actionsById.get('nextProject')!,
  PreviousProject: actionsById.get('previousProject')!,
  SelectProject1: actionsById.get('selectProject1')!,
  SelectProject2: actionsById.get('selectProject2')!,
  SelectProject3: actionsById.get('selectProject3')!,
  SelectProject4: actionsById.get('selectProject4')!,
  SelectProject5: actionsById.get('selectProject5')!,
  SelectProject6: actionsById.get('selectProject6')!,
  SelectProject7: actionsById.get('selectProject7')!,
  SelectProject8: actionsById.get('selectProject8')!,
  SelectProject9: actionsById.get('selectProject9')!,
  FindInTerminal: actionsById.get('findInTerminal')!,
  OpenVCSTab: actionsById.get('openVCSTab')!,
  QuickOpen: actionsById.get('quickOpen')!,
  SwitchWorktree: actionsById.get('switchWorktree')!,
  SaveFile: actionsById.get('saveFile')!,
  ToggleSidebar: actionsById.get('toggleSidebar')!,
  ToggleFileTree: actionsById.get('toggleFileTree')!,
  ToggleAIUsage: actionsById.get('toggleAIUsage')!,
  NavigateBack: actionsById.get('navigateBack')!,
  NavigateForward: actionsById.get('navigateForward')!,
  ToggleThemePicker: actionsById.get('toggleThemePicker')!,
  NewProject: actionsById.get('newProject')!,
  OpenProject: actionsById.get('openProject')!,
  ReloadConfig: actionsById.get('reloadConfig')!,
}

export interface KeyBinding {
  action: ShortcutActionDef
  combo: KeyCombo
}

function cmd(key: string, shift = false): KeyCombo {
  return { key, modifiers: primaryModifier() | (shift ? ModifierFlags.shift : 0) }
}

function ctrl(key: string, shift = false): KeyCombo {
  return { key, modifiers: ModifierFlags.control | (shift ? ModifierFlags.shift : 0) }
}

function cmdCtrl(key: string, extra = 0): KeyCombo {
  return { key, modifiers: primaryModifier() | ModifierFlags.control | extra }
}

function cmdAlt(key: string): KeyCombo {
  return { key, modifiers: primaryModifier() | ModifierFlags.alt }
}

export const defaultBindings: KeyBinding[] = [
  { action: ShortcutAction.NewTab, combo: cmd('t') },
  { action: ShortcutAction.CloseTab, combo: cmd('w') },
  { action: ShortcutAction.RenameTab, combo: cmd('t', true) },
  { action: ShortcutAction.PinUnpinTab, combo: cmd('p', true) },
  { action: ShortcutAction.SplitRight, combo: cmd('d') },
  { action: ShortcutAction.SplitDown, combo: cmd('d', true) },
  { action: ShortcutAction.ClosePane, combo: cmd('w', true) },
  { action: ShortcutAction.FocusPaneLeft, combo: cmdAlt(ARROW_KEYS.left) },
  { action: ShortcutAction.FocusPaneRight, combo: cmdAlt(ARROW_KEYS.right) },
  { action: ShortcutAction.FocusPaneUp, combo: cmdAlt(ARROW_KEYS.up) },
  { action: ShortcutAction.FocusPaneDown, combo: cmdAlt(ARROW_KEYS.down) },
  { action: ShortcutAction.ToggleThemePicker, combo: cmd('k', true) },
  { action: ShortcutAction.OpenVCSTab, combo: cmd('k') },
  { action: ShortcutAction.OpenProject, combo: cmd('o') },
  { action: ShortcutAction.ReloadConfig, combo: cmd('r', true) },
  { action: ShortcutAction.NextTab, combo: cmd(']') },
  { action: ShortcutAction.PreviousTab, combo: cmd('[') },
  { action: ShortcutAction.SelectTab1, combo: cmd('1') },
  { action: ShortcutAction.SelectTab2, combo: cmd('2') },
  { action: ShortcutAction.SelectTab3, combo: cmd('3') },
  { action: ShortcutAction.SelectTab4, combo: cmd('4') },
  { action: ShortcutAction.SelectTab5, combo: cmd('5') },
  { action: ShortcutAction.SelectTab6, combo: cmd('6') },
  { action: ShortcutAction.SelectTab7, combo: cmd('7') },
  { action: ShortcutAction.SelectTab8, combo: cmd('8') },
  { action: ShortcutAction.SelectTab9, combo: cmd('9') },
  { action: ShortcutAction.NextProject, combo: ctrl(']') },
  { action: ShortcutAction.PreviousProject, combo: ctrl('[') },
  { action: ShortcutAction.SelectProject1, combo: ctrl('1') },
  { action: ShortcutAction.SelectProject2, combo: ctrl('2') },
  { action: ShortcutAction.SelectProject3, combo: ctrl('3') },
  { action: ShortcutAction.SelectProject4, combo: ctrl('4') },
  { action: ShortcutAction.SelectProject5, combo: ctrl('5') },
  { action: ShortcutAction.SelectProject6, combo: ctrl('6') },
  { action: ShortcutAction.SelectProject7, combo: ctrl('7') },
  { action: ShortcutAction.SelectProject8, combo: ctrl('8') },
  { action: ShortcutAction.SelectProject9, combo: ctrl('9') },
  { action: ShortcutAction.FindInTerminal, combo: cmd('f') },
  { action: ShortcutAction.QuickOpen, combo: cmd('p') },
  { action: ShortcutAction.SwitchWorktree, combo: cmd('o', true) },
  { action: ShortcutAction.SaveFile, combo: cmd('s') },
  { action: ShortcutAction.ToggleSidebar, combo: cmd('b') },
  { action: ShortcutAction.ToggleFileTree, combo: cmd('e') },
  { action: ShortcutAction.ToggleAIUsage, combo: cmd('l') },
  { action: ShortcutAction.NavigateBack, combo: cmdCtrl(ARROW_KEYS.left) },
  { action: ShortcutAction.NavigateForward, combo: cmdCtrl(ARROW_KEYS.right) },
]
