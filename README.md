# Excaligraph

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)

Multi-canvas management and element relationships for [Excalidraw](https://excalidraw.com).

## Overview

Excalidraw is excellent for individual drawings. Excaligraph extends it with:

- **Multi-canvas projects**: Manage multiple canvases in a single workspace
- **Element relationships**: Link elements across different canvases
- **Project persistence**: Save and export entire projects, not just individual drawings

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
| Excalidraw | latest | Canvas engine |

### Design Principles

1. **Feature-based organization**: Code organized by functionality, not file type
2. **Interfaces at extension points**: Only abstract where we plan to extend (persistence, canvas engine)
3. **Inward dependencies**: Features depend on shared code, never the reverse
4. **No over-engineering**: Simple code first, abstract only when needed

### Extension Points

The architecture defines interfaces at two critical points:

#### IGraphRepository (Persistence)

Allows switching data sources without changing business logic.

```typescript
interface IGraphRepository {
  getProject(id: string): Promise<Project | null>;
  saveProject(project: Project): Promise<void>;
  deleteProject(id: string): Promise<void>;
  listProjects(): Promise<ProjectSummary[]>;
  // ... drawings and links methods
}
```

**Implementations:**
- `LocalStorageRepository` - MVP, client-side only
- `APIRepository` - Future, for backend sync

#### ICanvasAdapter (Canvas Engine)

Decouples from Excalidraw for testing and potential future changes.

```typescript
interface ICanvasAdapter {
  getElements(): CanvasElement[];
  setElements(elements: CanvasElement[]): void;
  getViewState(): ViewState;
  onChange(callback: (elements: CanvasElement[]) => void): void;
  // ...
}
```

### Dependency Flow

```
┌─────────────────────────────────┐
│       UI / Features             │
└──────────────┬──────────────────┘
               │ uses interfaces
               ▼
┌──────────────────────────────────┐
│         Interfaces               │
│  IGraphRepository │ ICanvasAdapter│
└─────────┬─────────┴───────┬──────┘
          ▼                 ▼
   LocalStorage        Excalidraw
   Repository          Adapter
```

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
  constructor(private baseUrl: string) {}

  async getProject(id: string): Promise<Project | null> {
    const res = await fetch(`${this.baseUrl}/projects/${id}`);
    return res.ok ? res.json() : null;
  }

  async saveProject(project: Project): Promise<void> {
    await fetch(`${this.baseUrl}/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
  }

  // ... implement remaining methods
}
```

2. Swap the repository in your provider:

```typescript
// Before
const repository = new LocalStorageRepository();

// After
const repository = new APIRepository('https://api.example.com');
```

No changes needed in features or business logic.

## Documentation

- [Architecture Details](./ARCHITECTURE.md) - System design and patterns
- [Product Requirements (PRD)](./PRD.md) - Full specification and architecture details
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Code of Conduct](./CODE_OF_CONDUCT.md) - Community guidelines
- [Security Policy](./SECURITY.md) - Reporting vulnerabilities

## License

[MIT](./LICENSE)
