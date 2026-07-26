# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-07-26

### Added
- **ProjectTransferService**: Dedicated service for project backup export, format parsing, structural validation, and atomic storage replacement.
- **Unified Project Backup Format (v1)**: Standardized schema (`format: "linkdraw-project"`, `version: 1`) with backward compatibility for legacy `1.0.0` backups and direct `Drawing[]` arrays.
- **Custom React Confirmation Modal (`ConfirmModal`)**: Replaced browser `window.confirm`/`alert` calls with a clean, dark/light theme aware confirmation dialog.
- **Interactive Graph View (`Graph.tsx`)**: Cytoscape-powered interactive document graph visualization (`Cmd+G`).
- **Wiki-Style Autocomplete (`[[`)**: Instant drawing search and linking triggerable by typing `[[` inside text elements.
- **Backlinks Panel (`BacklinksPanel.tsx`)**: Real-time incoming reference inspector in the explorer sidebar.
- **Session Recovery Backup**: Automatic creation of a recovery snapshot in `sessionStorage` before executing project imports.
- **Import State Guard (`isImporting`)**: Global protection disabling debounced autosaves and clearing canvas loader caches during project imports to prevent race conditions.
- **Unit Test Suite Expansion**: Added 15 new test cases, expanding test suite to **126 tests**.

### Changed
- Refactored `ExplorerMenuModal` to use `ProjectTransferService` and `ConfirmModal` instead of direct `localStorage` writes and native browser popups.
- Extended `IGraphRepository` interface with `replaceAllDrawings(drawings: Drawing[])`.

---

## [0.1.0] - 2026-01-05

### Added
- Multi-canvas management with hierarchical tree structure.
- Drawing links using custom URI scheme (`drawing://id#element:xyz`).
- Smart navigation with auto-scroll and element highlighting.
- Auto-save with 500ms debounce and content caching.
- Tree-based drawing explorer with create/rename/delete operations.
- Keyboard shortcuts (`Cmd+N`, `Cmd+K`, `Cmd+S`, `Cmd+L`, `Cmd+B`).
- Search and filter functionality with recursive tree filtering.
- ExcalidrawAdapter for canvas engine abstraction.
- LocalStorageRepository for data persistence.
- DrawingService and LinkService for domain logic.
- Circular reference detection for tree hierarchy and link graph.
- 111 unit tests with ~88% code coverage.
