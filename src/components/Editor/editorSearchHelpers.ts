// Original: N/A — search state helpers extracted from EditorSearchBar
// Description: Module-level search state management for editor find/replace.
//              Visibility is managed by editorStore; this holds the query state.
// Status: 🚧 In progress

interface SearchState {
  needle: string
  replaceText: string
  caseSensitive: boolean
  useRegex: boolean
  replaceVisible: boolean
  matchCount: number
  currentIndex: number
  invalidRegex: boolean
}

const searchStates = new Map<string, SearchState>()

export function getSearchState(tabId: string): SearchState {
  return searchStates.get(tabId) ?? {
    needle: '',
    replaceText: '',
    caseSensitive: false,
    useRegex: false,
    replaceVisible: false,
    matchCount: 0,
    currentIndex: 0,
    invalidRegex: false,
  }
}

export function setSearchState(tabId: string, state: SearchState): void {
  searchStates.set(tabId, state)
}
