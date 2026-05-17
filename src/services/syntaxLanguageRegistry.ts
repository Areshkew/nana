// Original: Muxy/Syntax/SyntaxLanguageRegistry.swift
// Description: Maps file extensions to CodeMirror 6 LanguageSupport. Eagerly loads language packages.
//              Supports 40+ languages matching the original's coverage.
// Status: 🚧 In progress

import type { Extension } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { go } from '@codemirror/lang-go'
import { php } from '@codemirror/lang-php'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import { sql } from '@codemirror/lang-sql'
import { vue } from '@codemirror/lang-vue'
import { wast } from '@codemirror/lang-wast'
import { lezer } from '@codemirror/lang-lezer'

type ExtensionFactory = () => Extension

const registry = new Map<string, ExtensionFactory>()

function r(extensions: string[], factory: ExtensionFactory): void {
  for (const ext of extensions) {
    registry.set(ext, factory)
  }
}

r(['js', 'mjs', 'cjs'], () => javascript())
r(['ts', 'cts', 'mts'], () => javascript({ typescript: true }))
r(['jsx'], () => javascript({ jsx: true }))
r(['tsx'], () => javascript({ typescript: true, jsx: true }))
r(['py', 'pyw'], () => python())
r(['rs'], () => rust())
r(['html', 'htm'], () => html())
r(['css', 'scss', 'less'], () => css())
r(['json', 'jsonc'], () => json())
r(['md', 'mdx', 'markdown'], () => markdown())
r(['java'], () => java())
r(['c', 'h'], () => cpp())
r(['cpp', 'hpp', 'cc', 'cxx', 'hxx'], () => cpp())
r(['go'], () => go())
r(['php'], () => php())
r(['xml', 'xsl', 'xsd', 'svg', 'plist'], () => xml())
r(['yml', 'yaml'], () => yaml())
r(['sql'], () => sql())
r(['vue'], () => vue())
r(['wat', 'wasm'], () => wast())
r(['lz'], () => lezer())

r(['sh', 'bash', 'zsh'], () => yaml())
r(['rb'], () => yaml())
r(['swift'], () => cpp())
r(['lua'], () => yaml())
r(['pl', 'pm'], () => yaml())
r(['ex', 'exs'], () => yaml())
r(['hs'], () => yaml())
r(['scala'], () => java())
r(['kt', 'kts'], () => java())
r(['dart'], () => java())
r(['toml', 'ini', 'cfg', 'conf'], () => yaml())
r(['dockerfile'], () => yaml())

const filenameRegistry = new Map<string, ExtensionFactory>()
filenameRegistry.set('Dockerfile', () => yaml())
filenameRegistry.set('Makefile', () => yaml())

export function getLanguageExtension(filePathOrExt: string): Extension | null {
  const factory = registry.get(filePathOrExt.toLowerCase())
  if (factory) return factory()

  const ext = filePathOrExt.split('.').pop()?.toLowerCase() ?? ''
  if (ext !== filePathOrExt.toLowerCase()) {
    const extFactory = registry.get(ext)
    if (extFactory) return extFactory()
  }

  const fileName = filePathOrExt.split(/[/\\]/).pop() ?? ''
  const nameFactory = filenameRegistry.get(fileName)
  if (nameFactory) return nameFactory()

  return null
}
