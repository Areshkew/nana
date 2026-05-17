<div align="center">

<img src="public/icon.png" width="128" height="128" alt="Nana logo" />

# Nana

**Cross-platform terminal multiplexer, IDE, and VCS client.**

A port of [Muxy](https://github.com/jasonkneen/muxy) built with Electron.

[![Platform: Windows](https://img.shields.io/badge/Windows-0078D4?logo=windows11&logoColor=white)](#)
[![Platform: Linux](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black)](#)
[![Platform: macOS](https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

Nana is a full-featured development environment that combines a GPU-accelerated terminal multiplexer, a built-in code editor, and a Git/VCS client in a single window. It is an Electron-based port of the macOS-native Muxy app, bringing the same workflow to Windows, Linux, and macOS.

## Features

- **Terminal multiplexer** -- multiple terminal sessions with tab management, pane splitting, and drag-and-drop reordering
- **Built-in editor** -- CodeMirror 6-powered editor with syntax highlighting, multi-cursor, search, and 20+ language grammars
- **VCS integration** -- full Git client with status, diffs, commit history, branch management, worktree support, and pull request creation
- **File explorer** -- virtualized file tree with context menus, rename, create, and delete
- **Quick Open** -- fuzzy file search across open projects
- **Workspace persistence** -- tabs, splits, and layout are saved and restored across sessions
- **Theme support** -- bundled dark/light themes with customizable appearance

## Advantages Over the Original

| | Description |
|---|---|
| **Cross-platform** | Runs on Windows, Linux, and macOS. The original is macOS-only, built on SwiftUI and Metal. |
| **Web-native stack** | React, TypeScript, and CSS. Contributors familiar with web development can be productive immediately. |
| **Hot reload** | Vite dev server with HMR -- UI changes reflect in under a second. |
| **Portable terminal backend** | `node-pty` ships with the app. No external dependency on Ghostty or other GPU terminal frameworks. |
| **Identical feature set** | Feature parity with the original: tabs, splits, editor, VCS, worktrees, file tree, themes, and keyboard shortcuts. |

## Trade-offs

| | Description |
|---|---|
| **Higher memory usage** | Chromium renderer adds ~150--300 MB baseline overhead. The native Swift app sits at ~50--80 MB. |
| **Larger install size** | Packaged Electron app is ~150--200 MB vs. ~20--30 MB for a native macOS binary. |
| **No Metal GPU rendering** | The original renders terminal output via Metal with zero-copy framebuffer access. Nana uses `xterm.js` with WebGL/Canvas fallbacks. |
| **Slower cold start** | Electron boot time is ~2--4 s vs. near-instant for a native app. |
| **Less native feel** | Custom frameless window chrome and CSS-based UI, rather than native SwiftUI controls and system widgets. Acrylic blur is Windows-only; other platforms get a flat background. |
| **Battery impact** | Higher CPU/GPU usage from the Chromium process model, noticeable on laptops during extended sessions. |

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Electron 41 |
| UI | React 19, TypeScript |
| Build | Vite 6, electron-builder |
| Terminal | xterm.js + node-pty |
| Editor | CodeMirror 6 |
| State | Zustand |
| Styling | Tailwind CSS 4 |
| Validation | Zod |
| Testing | Vitest |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- npm >= 9

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens the app with hot module replacement. Changes to renderer code (`src/`) reload instantly; changes to main process code (`electron/`) trigger an automatic restart.

### Build

```bash
npm run build
```

Compiles TypeScript, bundles the renderer with Vite, generates the application icon, and packages with electron-builder. Output goes to `dist/`.

### Lint

```bash
npm run lint
```

### Test

```bash
npm run test
```

Runs Vitest for both renderer and main process test suites.

## Project Structure

```
new-stack/
  electron/           Main process (IPC handlers, PTY, persistence)
  src/
    components/       React UI components
    stores/           Zustand state stores
    services/         Business logic and side effects
    models/           Pure data models and reducers
    hooks/            Custom React hooks
    views/            Top-level view compositions
    workers/          Web Workers (PTY I/O, syntax tokenizer)
    theme/            Theme definitions
  public/             Static assets
  scripts/            Build utilities
```

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

*Ported from [Muxy](https://github.com/jasonkneen/muxy) by [Areshk](https://github.com/Areshk)*

</div>
