# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-05

### Added
- Multi-canvas management with hierarchical tree structure
- Drawing links using custom URI scheme (`drawing://id#element:xyz`)
- Smart navigation with auto-scroll and element highlighting
- Auto-save with 500ms debounce and content caching
- Tree-based drawing explorer with create/rename/delete operations
- Keyboard shortcuts:
  - `Cmd+N` - Create new drawing
  - `Cmd+K` - Toggle search
  - `Cmd+S` - Manual save
  - `Cmd+L` - Add link to selection
- Search and filter functionality with recursive tree filtering
- Link modal showing element text/name instead of IDs
- Confirmation dialogs for safe deletion
- ExcalidrawAdapter for canvas abstraction
- LocalStorageRepository for data persistence
- DrawingService and LinkService for business logic
- Circular reference detection for tree hierarchy and link graph
- 111 unit tests with ~88% code coverage
- Coverage reporting with v8 provider
- Custom hooks:
  - `useCanvasLoader` - Drawing loading with caching
  - `useElementSelection` - Track selected elements
  - `useLinkNavigation` - Handle link navigation
  - `useAutoSave` - Debounced auto-save
  - `useKeyboardShortcuts` - Global shortcuts

### Technical
- TypeScript strict mode with no `any` types
- Clean architecture with interface-based extension points
- Feature-based code organization
- Zustand for state management
- Tailwind CSS for styling
- Biome for linting and formatting
- Vitest for testing with happy-dom

### Documentation
- Comprehensive README with features and architecture
- Detailed ARCHITECTURE.md with implementation details
- Inline code documentation
- Testing guide

[0.1.0]: https://github.com/bug-devs/excaligraph/releases/tag/v0.1.0
