# LinkDraw

<p align="center">
  <img src="./public/vite.svg" width="80" alt="LinkDraw Logo" />
</p>

<h3 align="center">LinkDraw</h3>

<p align="center">
  A modern, privacy-first multi-canvas workspace and visual knowledge base built on top of <a href="https://excalidraw.com">Excalidraw</a>.
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5.9" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19.2-61dafb?logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://vite.dev"><img src="https://img.shields.io/badge/Vite-7.2-646cff?logo=vite&logoColor=white" alt="Vite 7" /></a>
  <a href="https://vitest.dev"><img src="https://img.shields.io/badge/Vitest-4.0-729b1b?logo=vitest&logoColor=white" alt="Vitest 4" /></a>
  <a href="https://excalidraw.com"><img src="https://img.shields.io/badge/Excalidraw-0.18-6965db" alt="Excalidraw" /></a>
</p>

---

## 💡 Overview

Excalidraw is an incredible infinite canvas tool for sketching and architecture diagrams. **LinkDraw** elevates it into a structured visual workspace by enabling **multi-canvas project trees**, **deep element linking**, **interactive graph views**, and **wiki-style references**.

All data is kept strictly private and stored locally in your browser using structured storage abstractions, with support for seamless JSON project import/export backups.

---

## ✨ Features

- 🌳 **Hierarchical Multi-Canvas Tree**: Organize infinite canvases in parent-child trees with drag-and-drop reorganization and duplicate/copy support.
- 🔗 **Inter-Canvas Deep Linking**: Hyperlink elements or entire drawings using `drawing://id#element:xyz`. Clicking links smoothly loads the target canvas and centers on the linked element.
- 🕸️ **Interactive Graph View**: Visualize project structure and inter-drawing relationships in a responsive node-link graph view (`Cmd+G`).
- 💡 **Wiki-Style Autocomplete (`[[`)**: Type `[[` inside any text box to trigger instantaneous drawing search and inline linking.
- 📌 **Backlinks Panel**: Inspect incoming references across drawings in real-time.
- 📦 **Unified Project Transfer & Backups**: Export and import complete projects with `ProjectTransferService`, version 1 schemas, circular reference checking, and recovery backups in `sessionStorage`.
- ⚡ **Race-Safe Auto-Save**: 500ms debounced autosave synchronized with canvas loader caches and import state guards.
- 🌙 **Dark & Light Mode**: Seamless dark/light theme switching for canvas, tree, graph, and UI modals.
- 🧪 **Comprehensive Test Coverage**: 126 automated unit & integration tests written with Vitest and Happy DOM.

---

## ⚡ Quick Start

### Prerequisites
- Node.js >= 18
- pnpm / npm / yarn

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/bug-devs/link-draw.git
cd link-draw

# Install dependencies
pnpm install

# Start local development server
pnpm dev
```

Open `http://localhost:5173` in your browser.

---

## 🛠️ Key Commands

| Script | Command | Purpose |
| :--- | :--- | :--- |
| **Development** | `pnpm dev` | Start Vite dev server with hot reload |
| **Production Build** | `pnpm build` | Run TypeScript check (`tsc -b`) and Vite production bundle |
| **Unit Tests** | `pnpm test` | Run Vitest test suite |
| **Coverage** | `pnpm test:coverage` | Generate V8 coverage report |
| **Linter & Format** | `pnpm check` | Run Biome lint & code style checks |
| **Auto-Fix** | `pnpm check:fix` | Fix code format and linting issues automatically |

---

## 📐 Architecture & System Design

LinkDraw adheres to **Clean Architecture** principles, enforcing strict dependency boundaries between UI features, core domain services, and extension interfaces.

```
┌─────────────────────────────────────────────────────────────┐
│                       UI Layer                              │
│         Canvas  │  Explorer  │  Graph  │  Modals            │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Service & Store Layer                    │
│    DrawingService │ LinkService │ ProjectTransferService    │
│    useDrawingStore │ useTreeStore │ useThemeStore           │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   Interface Abstractions                    │
│        IGraphRepository      │      ICanvasAdapter          │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│ LocalStorageRepository      │ │ ExcalidrawAdapter           │
│ (IndexedDB/API Future)      │ │ (Canvas Engine)             │
└─────────────────────────────┘ └─────────────────────────────┘
```

### Core Abstractions

#### 1. `IGraphRepository` (Persistence Engine)
Abstracts drawing persistence so storage backends can be swapped without touching UI logic:

```typescript
export interface IGraphRepository {
  createDrawing(title: string, parentId?: string | null): Promise<string>
  loadDrawing(id: string): Promise<Drawing | null>
  saveDrawing(id: string, data: DrawingInput): Promise<void>
  deleteDrawing(id: string): Promise<void>
  listDrawings(): Promise<Drawing[]>
  getDrawingsTree(): Promise<DrawingTreeNode[]>
  replaceAllDrawings(drawings: Drawing[]): Promise<void>
}
```

#### 2. `ProjectTransferService` (Import/Export & Validation)
Manages backup export, structural validation, parent hierarchy validation, circular reference prevention, and atomic project replacement:

```typescript
export interface LinkDrawProjectBackup {
  format: "linkdraw-project"
  version: 1
  exportedAt: string
  drawings: Drawing[]
}
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Cmd + N` | Create a new drawing |
| `Cmd + K` | Search drawings |
| `Cmd + G` | Toggle Graph view |
| `Cmd + S` | Force save current drawing |
| `Cmd + L` / `Cmd + K` | Add link to selected canvas element |
| `Cmd + B` | Toggle Explorer sidebar |

---

## 🧪 Testing

All services, graph algorithms, link parsers, and custom hooks are thoroughly tested using Vitest and Happy DOM.

```bash
pnpm test -- --run
```

```
 Test Files  14 passed (14)
      Tests  126 passed (126)
```

---

## 📄 Documentation

- 📚 [Architecture Guide](./ARCHITECTURE.md) - Deep dive into system layers and design principles
- 📝 [Changelog](./CHANGELOG.md) - Record of project releases and notable updates
- 🤝 [Contributing Guide](./CONTRIBUTING.md) - Guidelines for contributing to LinkDraw

---

## 📜 License

Distributed under the [MIT License](./LICENSE).
