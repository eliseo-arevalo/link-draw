# LinkDraw

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)

Multi-canvas management and element relationships for [Excalidraw](https://excalidraw.com).

## Overview

Excalidraw is excellent for individual drawings. LinkDraw extends it with:

- **Multi-canvas projects**: Manage multiple canvases in a hierarchical tree structure
- **Element relationships**: Link elements and entire drawings across canvases
- **Auto-save**: Automatic content persistence with debounced saves
- **Navigation**: Click links to navigate between drawings and focus on specific elements
- **Project persistence**: All data stored locally in browser (localStorage)

## Features

### ✨ Current (v0.1.0)

- **Tree-based Drawing Explorer**: Hierarchical organization with create, rename, delete operations
- **Canvas Integration**: Full Excalidraw functionality with custom link handling
- **Drawing Links**: Link to entire drawings or specific elements/frames
- **Smart Navigation**: Auto-scroll and highlight when navigating to linked elements
- **Auto-save**: 500ms debounced saves with content caching during navigation
- **Confirmation Dialogs**: Safe deletion with user confirmation
- **Responsive UI**: Sidebar + canvas layout with Tailwind CSS

### 🧪 Testing

- **111 unit tests** covering services, adapters, utilities, and hooks
- **~88% code coverage** with v8 provider
- **Fast execution**: All tests run in ~3-4 seconds

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run linter
pnpm lint

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7 | Build tool |
| Vitest | 4 | Testing framework |
| Excalidraw | 0.18 | Canvas engine |
| Zustand | 5 | State management |
| Tailwind CSS | 4 | Styling |
| Biome | 2.3 | Linting & formatting |

## Architecture

### Design Principles

1. **Feature-based organization**: Code organized by functionality, not file type
2. **Interfaces at extension points**: Only abstract where we plan to extend (persistence, canvas engine)
3. **Inward dependencies**: Features depend on shared code, never the reverse
4. **No over-engineering**: Simple code first, abstract only when needed

### Project Structure

```
src/
├── features/           # Feature modules
│   ├── canvas/        # Canvas and drawing management
│   │   ├── components/
│   │   ├── hooks/
│   │   └── Canvas.tsx
│   └── explorer/      # Tree-based drawing explorer
│       ├── components/
│       ├── hooks/
│       └── DrawingsExplorer.tsx
├── shared/            # Shared utilities
│   ├── adapters/     # External library adapters
│   ├── constants/    # Shared constants
│   ├── hooks/        # Reusable hooks
│   ├── interfaces/   # Core interfaces
│   ├── lib/          # Utility functions
│   ├── repositories/ # Data persistence
│   ├── services/     # Business logic
│   ├── store/        # Global state
│   └── types/        # TypeScript types
└── App.tsx           # Root component
```

### Extension Points

The architecture defines interfaces at two critical points:

#### IGraphRepository (Persistence)

Allows switching data sources without changing business logic.

```typescript
interface IGraphRepository {
  createDrawing(title: string, parentId: string | null): Promise<string>;
  loadDrawing(id: string): Promise<Drawing | null>;
  saveDrawing(id: string, input: DrawingInput): Promise<void>;
  deleteDrawing(id: string): Promise<void>;
  getDrawingsTree(): Promise<DrawingTreeNode[]>;
  // ... more methods
}
```

**Current Implementation:**
- `LocalStorageRepository` - Browser localStorage (v0.1.0)

**Future:**
- `APIRepository` - Backend sync with authentication
- `IndexedDBRepository` - Better performance for large projects

#### ICanvasAdapter (Canvas Engine)

Decouples from Excalidraw for testing and potential future changes.

```typescript
interface ICanvasAdapter {
  getContent(): ExcalidrawContent;
  setContent(content: ExcalidrawContent): void;
  onChange(callback: (content: ExcalidrawContent) => void): () => void;
  scrollToElement(elementId: string): void;
  highlightElement(elementId: string): void;
  // ... more methods
}
```

**Current Implementation:**
- `ExcalidrawAdapter` - Wraps Excalidraw API

### Dependency Flow

```
┌─────────────────────────────────┐
│       UI / Features             │
│   Canvas │ Explorer             │
└──────────────┬──────────────────┘
               │ uses interfaces
               ▼
┌──────────────────────────────────┐
│    Services & Interfaces         │
│  DrawingService │ LinkService    │
│  IGraphRepository │ ICanvasAdapter│
└─────────┬─────────┴───────┬──────┘
          ▼                 ▼
   LocalStorage        Excalidraw
   Repository          Adapter
```

## Key Features Explained

### Drawing Links

Links use a custom URI scheme: `drawing://[id][#element:id|#frame:id]`

- `drawing://abc123` - Link to entire drawing
- `drawing://abc123#element:xyz` - Link to specific element
- `drawing://abc123#frame:xyz` - Link to specific frame

### Auto-save Strategy

1. **Debounced saves**: 500ms delay after last change
2. **Content caching**: Previous drawing content cached before navigation
3. **Stable references**: useRef pattern prevents onChange reconnections
4. **Batch saves**: All cached drawings saved together

### Navigation Flow

1. User clicks link in Excalidraw
2. `useLinkNavigation` parses the link
3. `useCanvasLoader` caches current content
4. New drawing loads into canvas
5. If element specified, scroll and highlight it

## Extending the Project

### Adding a New Feature

1. Create a folder under `src/features/your-feature/`
2. Include components, hooks, types, and an `index.ts` barrel export
3. Import shared utilities from `src/shared/`
4. Never import from other features directly; use shared abstractions

### Changing Persistence (localStorage to API)

1. Implement `IGraphRepository` interface:

```typescript
class APIRepository implements IGraphRepository {
  constructor(private baseUrl: string, private token: string) {}

  async createDrawing(title: string, parentId: string | null): Promise<string> {
    const res = await fetch(`${this.baseUrl}/drawings`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ title, parentId }),
    });
    const { id } = await res.json();
    return id;
  }

  // ... implement remaining methods
}
```

2. Swap the repository in your components:

```typescript
// Before
const repository = new LocalStorageRepository();

// After
const repository = new APIRepository('https://api.example.com', token);
```

No changes needed in features or business logic.

## Testing

Tests are colocated with source files using `.test.ts` or `.test.tsx` extensions.

**Coverage by module:**
- Services: DrawingService, LinkService, graph algorithms
- Adapters: ExcalidrawAdapter (96% coverage)
- Utilities: tree-utils, drawing-links, utils
- Hooks: useAutoSave

Run `pnpm test:coverage` to see detailed HTML report in `coverage/index.html`.

## Documentation

- [Architecture Details](./ARCHITECTURE.md) - System design and patterns
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Code of Conduct](./CODE_OF_CONDUCT.md) - Community guidelines
- [Security Policy](./SECURITY.md) - Reporting vulnerabilities

## License

[MIT](./LICENSE)
