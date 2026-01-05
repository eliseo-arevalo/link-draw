# Excaligraph - Architecture

## Overview

Excaligraph extends Excalidraw with multi-canvas management and element relationships. The architecture follows clean architecture principles with clear separation of concerns and dependency inversion at key extension points.

## Design Principles

1. **Feature-based organization**: Code organized by functionality, not file type
2. **Interfaces at extension points**: Only abstract where we plan to extend (persistence, canvas engine)
3. **Inward dependencies**: Features depend on shared code, never the reverse
4. **No over-engineering**: Simple code first, abstract only when needed

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (Features)                   │
│              Canvas │ Explorer │ Components              │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────┐
│                   Service Layer                          │
│         DrawingService │ LinkService                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────┐
│                  Interface Layer                         │
│        IGraphRepository │ ICanvasAdapter                 │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│              Implementation Layer                        │
│    LocalStorageRepository │ ExcalidrawAdapter           │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── features/              # Feature modules (UI)
│   ├── canvas/           # Canvas and drawing management
│   │   ├── components/   # DrawingPickerModal, LinkButton, etc.
│   │   ├── hooks/        # useCanvasLoader, useElementSelection, etc.
│   │   └── Canvas.tsx    # Main canvas component
│   └── explorer/         # Tree-based drawing explorer
│       ├── components/   # TreeNode, DeleteConfirmDialog, etc.
│       ├── hooks/        # useTreeActions
│       └── DrawingsExplorer.tsx
│
├── shared/               # Shared utilities
│   ├── adapters/        # External library adapters
│   │   └── excalidraw/
│   │       └── ExcalidrawAdapter.ts
│   ├── constants/       # Shared constants (layout, etc.)
│   ├── hooks/           # Reusable hooks (useAutoSave)
│   ├── interfaces/      # Core interfaces
│   │   ├── ICanvasAdapter.ts
│   │   └── IGraphRepository.ts
│   ├── lib/             # Utility functions
│   │   ├── drawing-links.ts
│   │   ├── tree-utils.ts
│   │   └── utils.ts
│   ├── repositories/    # Data persistence
│   │   └── localStorage/
│   │       └── LocalStorageRepository.ts
│   ├── services/        # Business logic
│   │   ├── DrawingService.ts
│   │   ├── LinkService.ts
│   │   └── link/
│   │       └── graph-algorithms.ts
│   ├── store/           # Global state (Zustand)
│   │   ├── drawingStore.ts
│   │   └── treeStore.ts
│   └── types/           # TypeScript types
│       └── drawing.ts
│
└── App.tsx              # Root component
```

## Core Interfaces

### IGraphRepository (Persistence)

Abstracts data access to allow switching storage backends without changing business logic.

```typescript
interface IGraphRepository {
  // CRUD operations
  createDrawing(title: string, parentId: string | null): Promise<string>;
  loadDrawing(id: string): Promise<Drawing | null>;
  saveDrawing(id: string, input: DrawingInput): Promise<void>;
  deleteDrawing(id: string): Promise<void>;
  
  // Tree operations
  getDrawingsTree(): Promise<DrawingTreeNode[]>;
  setDrawingParent(id: string, newParentId: string | null): Promise<void>;
  
  // Metadata
  updateDrawingTitle(id: string, title: string): Promise<void>;
  getDrawingSummaries(): Promise<DrawingSummary[]>;
}
```

**Current Implementation:**
- `LocalStorageRepository` - Browser localStorage (v0.1.0)

**Future Implementations:**
- `APIRepository` - Backend sync with authentication
- `IndexedDBRepository` - Better performance for large projects

### ICanvasAdapter (Canvas Engine)

Decouples from Excalidraw to enable testing and potential future canvas engine changes.

```typescript
interface ICanvasAdapter {
  // API management
  setAPI(api: ExcalidrawImperativeAPI): void;
  getAPI(): ExcalidrawImperativeAPI | null;
  
  // Content management
  getContent(): ExcalidrawContent;
  setContent(content: ExcalidrawContent): void;
  
  // Event handling
  onChange(callback: (content: ExcalidrawContent) => void): () => void;
  onSave(callback: () => void): () => void;
  
  // Navigation
  scrollToElement(elementId: string): void;
  highlightElement(elementId: string): void;
  
  // Link extraction
  extractDrawingLinks(): DrawingLink[];
  
  // State tracking
  hasUnsavedChanges(): boolean;
  markAsSaved(): void;
}
```

**Current Implementation:**
- `ExcalidrawAdapter` - Wraps Excalidraw API

## Key Features

### 1. Drawing Links

Links use a custom URI scheme: `drawing://[id][#element:id|#frame:id]`

```typescript
// Link to entire drawing
"drawing://abc123"

// Link to specific element
"drawing://abc123#element:xyz"

// Link to specific frame
"drawing://abc123#frame:xyz"
```

**Implementation:**
- Links stored as Excalidraw element properties
- Parsed on-demand using `parseDrawingLink()`
- Validated using `isDrawingLink()`

### 2. Auto-save Strategy

```typescript
// 500ms debounced saves
const { triggerSave } = useAutoSave(saveFunction, { delay: 500 });

// Content caching during navigation
const contentCacheRef = useRef<Map<string, ExcalidrawContent>>(new Map());

// Stable function references with useRef
const saveAllRef = useRef(saveAllCachedDrawings);
saveAllRef.current = saveAllCachedDrawings;
```

**Flow:**
1. User edits → Excalidraw fires `onChange`
2. Adapter calls `notifyChange()`
3. Hook debounces for 500ms
4. Service saves content + cached drawings
5. Adapter marks as saved

### 3. Navigation Flow

```typescript
// 1. User clicks link
onLinkOpen={(element, event) => handleLinkOpen(element, event)}

// 2. Parse link
const parsed = parseDrawingLink(link);

// 3. Cache current content
contentCacheRef.current.set(currentDrawingId, adapter.getContent());

// 4. Load new drawing
await drawingService.loadDrawing(parsed.drawingId);

// 5. Scroll to element (if specified)
if (parsed.elementId) {
  adapter.scrollToElement(parsed.elementId);
  adapter.highlightElement(parsed.elementId);
}
```

### 4. Circular Reference Detection

**Tree Hierarchy:**
```typescript
// Prevents: A → B → C → A
wouldCreateCircularReference(drawingId, newParentId)
```

**Link Graph:**
```typescript
// Prevents: Drawing A links to B, B links to C, C links to A
wouldCreateCircularLinkReference(sourceId, targetId)
```

**Algorithm:** Depth-First Search (DFS) with visited tracking

## Data Flow Examples

### Creating a Drawing

```
User Action
    ↓
DrawingsExplorer.handleCreateDrawing()
    ↓
repository.createDrawing(title, parentId)
    ↓
repository.saveDrawing(id, content)
    ↓
treeStore.setTree(updatedTree)
    ↓
drawingStore.setActiveDrawingId(id)
    ↓
UI Updates
```

### Loading a Drawing

```
User Clicks Drawing
    ↓
drawingStore.setActiveDrawingId(id)
    ↓
useCanvasLoader detects change
    ↓
Cache current content
    ↓
drawingService.loadDrawing(id)
    ↓
adapter.setContent(drawing.content)
    ↓
Excalidraw renders
```

### Auto-saving

```
User Edits
    ↓
Excalidraw.onChange()
    ↓
adapter.notifyChange()
    ↓
useAutoSave.triggerSave()
    ↓
[500ms debounce]
    ↓
saveAllCachedDrawings()
    ↓
drawingService.saveCurrentDrawing()
    ↓
repository.saveDrawing()
    ↓
adapter.markAsSaved()
```

## State Management

### drawingStore (Zustand)

```typescript
{
  activeDrawingId: string | null,
  isLoadingDrawing: boolean,
  setActiveDrawingId: (id: string | null) => void,
  setIsLoadingDrawing: (loading: boolean) => void
}
```

### treeStore (Zustand)

```typescript
{
  tree: DrawingTreeNode[],
  setTree: (tree: DrawingTreeNode[]) => void
}
```

**Why Zustand?**
- Minimal boilerplate
- No providers needed
- Easy to test
- TypeScript-first

## Testing Strategy

### Unit Tests (111 tests, ~88% coverage)

**Services:**
- DrawingService: CRUD operations, validation
- LinkService: Circular reference detection, backlinks
- graph-algorithms: DFS cycle detection

**Adapters:**
- ExcalidrawAdapter: Content management, event handling, navigation

**Utilities:**
- tree-utils: Tree traversal, path finding
- drawing-links: Link parsing, validation
- utils: General utilities

**Hooks:**
- useAutoSave: Debouncing, lifecycle callbacks, error handling

### Test Structure

```typescript
describe('DrawingService', () => {
  let service: DrawingService;
  let mockRepository: Mocked<IGraphRepository>;
  let mockCanvas: Mocked<ICanvasAdapter>;

  beforeEach(() => {
    mockRepository = { /* mocked methods */ };
    mockCanvas = { /* mocked methods */ };
    service = new DrawingService(mockRepository, mockCanvas);
  });

  it('should create a drawing', async () => {
    // Test implementation
  });
});
```

## Performance Considerations

### Complexity Analysis

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Create drawing | O(n) | Validate parent exists |
| Load drawing | O(n) | Search in array |
| Build tree | O(n) | Single pass with Map |
| Detect cycle (tree) | O(d) | d = tree depth |
| Detect cycle (links) | O(V + E) | DFS on graph |
| Get backlinks | O(n × m) | n drawings, m elements each |

### Optimizations

- ✅ Map for O(1) lookups
- ✅ Set for O(1) membership checks
- ✅ Debounced saves (500ms)
- ✅ Content caching during navigation
- ✅ Stable function references with useRef

## Extension Points

### Adding a New Storage Backend

```typescript
class SupabaseRepository implements IGraphRepository {
  constructor(private client: SupabaseClient) {}

  async createDrawing(title: string, parentId: string | null): Promise<string> {
    const { data, error } = await this.client
      .from('drawings')
      .insert({ title, parent_id: parentId })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  }

  // ... implement other methods
}
```

### Adding a New Canvas Engine

```typescript
class TldrawAdapter implements ICanvasAdapter {
  private editor: Editor | null = null;

  setAPI(editor: Editor): void {
    this.editor = editor;
  }

  getContent(): ExcalidrawContent {
    // Convert Tldraw shapes to our format
  }

  // ... implement other methods
}
```

## Future Enhancements

### v0.2.0
- Undo/Redo across drawings
- Search/filter in explorer
- Drag & drop for reorganization
- Export/Import project

### v0.3.0
- Real-time collaboration
- Cloud sync with authentication
- Version history
- Comments and annotations

### v1.0.0
- Plugin system
- Custom themes
- Advanced link types (bidirectional, typed)
- Performance optimizations for large projects

## References

- [Excalidraw Documentation](https://docs.excalidraw.com/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Vitest Documentation](https://vitest.dev/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
