// Original: Muxy/Views/VCS/DiffTextBridge.swift — buildDiffAttributedString
// Description: Web Worker that tokenizes diff lines using highlight.js for syntax
//              coloring. Keeps the ~1ms+ per-line tokenization cost off the main
//              thread. Returns plain-text token arrays (no DOM/color objects).
// Status: Completed

import hljs from 'highlight.js'

interface TokenizeRequest {
  type: 'tokenize'
  id: number
  lines: string[]
  language: string
}

interface TokenizeResponse {
  type: 'tokenized'
  id: number
  tokens: { start: number; end: number; scope: string }[][]
}

type WorkerMessage = TokenizeRequest

function detectLanguage(code: string, candidate: string): string {
  if (candidate && hljs.getLanguage(candidate)) {
    return candidate
  }

  const result = hljs.highlightAuto(code, [])
  return result.language ?? 'plaintext'
}

const extensionMap: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rs: 'rust',
  go: 'go',
  rb: 'ruby',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  php: 'php',
  sql: 'sql',
  html: 'xml',
  css: 'css',
  scss: 'scss',
  json: 'json',
  yaml: 'yaml',
  xml: 'xml',
  md: 'markdown',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'bash',
  ps1: 'powershell',
  toml: 'ini',
  lock: 'json',
}

function languageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext && extensionMap[ext]) {
    return extensionMap[ext]
  }
  return 'plaintext'
}

interface HljsNode {
  scope?: string
  children?: HljsNode[]
  value?: string
}

function tokenizeLine(line: string, language: string): { start: number; end: number; scope: string }[] {
  const result = hljs.highlight(line, { language, ignoreIllegals: true })
  const tokens: { start: number; end: number; scope: string }[] = []

  let pos = 0
  function walk(nodes: HljsNode[]): void {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        walk(node.children)
      } else if (typeof node.value === 'string' && node.value.length > 0) {
        tokens.push({
          start: pos,
          end: pos + node.value.length,
          scope: node.scope ?? '',
        })
        pos += node.value.length
      }
    }
  }

  const emitter = (result as unknown as Record<string, unknown>)._emitter as { rootNode?: { children?: HljsNode[] } } | undefined
  if (emitter?.rootNode?.children) {
    walk(emitter.rootNode.children)
  }

  return tokens
}

self.onmessage = (e: MessageEvent<WorkerMessage>): void => {
  const msg = e.data

  if (msg.type === 'tokenize') {
    const language = detectLanguage(msg.lines.join('\n'), msg.language)
    const tokens = msg.lines.map((line) => tokenizeLine(line, language))

    const response: TokenizeResponse = {
      type: 'tokenized',
      id: msg.id,
      tokens,
    }
    self.postMessage(response)
  }
}

export { languageFromPath }
