import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { SIDEBAR_WIDTH } from "@/shared/constants/layout"
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts"
import { LocalStorageRepository } from "@/shared/repositories/localStorage/LocalStorageRepository"
import { DrawingService } from "@/shared/services/DrawingService"
import { ExcalidrawAdapter } from "@/shared/adapters/excalidraw/ExcalidrawAdapter"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useTreeStore } from "@/shared/store/treeStore"
import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"
import { useDragAndDrop } from "./hooks/useDragAndDrop"
import type { DrawingTreeNode } from "@/shared/types/drawing"

const repository = new LocalStorageRepository()
const adapter = new ExcalidrawAdapter()
const drawingService = new DrawingService(repository, adapter)

interface DrawingsExplorerProps {
  isCollapsed: boolean
  onToggleSidebar: () => void
  onToggleGraph: () => void
  isGraphView: boolean
}

export function DrawingsExplorer({ isCollapsed, onToggleSidebar, onToggleGraph, isGraphView }: DrawingsExplorerProps) {
  const { tree, setTree } = useTreeStore()
  const { activeDrawingId, setActiveDrawingId } = useDrawingStore()
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const dragAndDrop = useDragAndDrop()

  const handleCreateDrawing = async () => {
    setIsCreating(true)
    setError(null)
    try {
      const id = await repository.createDrawing("New Drawing", null)
      await repository.saveDrawing(id, {
        content: {
          elements: [],
          appState: {},
          files: {},
        },
      })

      const updatedTree = await repository.getDrawingsTree()
      setTree(updatedTree)
      setActiveDrawingId(id)
    } catch (err) {
      setError("Failed to create drawing")
      console.error("Failed to create drawing:", err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectDrawing = (id: string) => {
    console.log("[Sidebar] Selecting drawing:", id)
    setActiveDrawingId(id)
  }

  const handleDrop = async (draggedId: string, targetId: string | null) => {
    try {
      await drawingService.moveDrawing(draggedId, targetId)
      const updatedTree = await repository.getDrawingsTree()
      setTree(updatedTree)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move drawing")
    } finally {
      dragAndDrop.handleDragEnd()
    }
  }

  const toggleSearch = () => {
    setShowSearch(!showSearch)
    if (!showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 0)
    } else {
      setSearchQuery("")
    }
  }

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      meta: true,
      handler: handleCreateDrawing,
      description: "Create new drawing",
    },
    {
      key: "k",
      meta: true,
      handler: toggleSearch,
      description: "Toggle search",
    },
  ])

  // Filter tree based on search query
  const filterTree = (nodes: DrawingTreeNode[], query: string): DrawingTreeNode[] => {
    if (!query.trim()) return nodes

    const lowerQuery = query.toLowerCase()

    return nodes.reduce<DrawingTreeNode[]>((acc, node) => {
      const matchesTitle = node.title.toLowerCase().includes(lowerQuery)
      const filteredChildren = node.children ? filterTree(node.children, query) : []

      if (matchesTitle || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        })
      }

      return acc
    }, [])
  }

  const filteredTree = filterTree(tree, searchQuery)

  useEffect(() => {
    let cancelled = false

    const loadTree = async () => {
      try {
        const drawings = await repository.getDrawingsTree()
        if (!cancelled) {
          setTree(drawings)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load drawings")
          console.error("Failed to load tree:", err)
        }
      }
    }
    loadTree()

    return () => {
      cancelled = true
    }
  }, [setTree])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMenu])

  if (isCollapsed) {
    return (
      <div
        className="h-full flex flex-col items-center"
        style={{
          width: "48px",
          minWidth: "48px",
          backgroundColor: colors.background,
          borderRight: `1px solid ${colors.border}`,
          padding: "0.5rem 0",
        }}
      >
        <button
          type="button"
          onClick={onToggleSidebar}
          className="excalidraw-button"
          style={{
            padding: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
                color: colors.text,
          }}
          title="Show sidebar (Cmd+B)"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{
        width: `${SIDEBAR_WIDTH}px`,
        minWidth: `${SIDEBAR_WIDTH}px`,
        backgroundColor: colors.background,
        borderRight: `1px solid ${colors.border}`,
      }}
    >
      {/* Header */}
      <div
        className="border-b"
        style={{
          borderColor: "var(--excalidraw-border)",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            minHeight: "3rem",
            padding: "0 1rem",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: colors.text }}>
            EXPLORER
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const { theme, setTheme } = useThemeStore.getState()
                setTheme(theme === "light" ? "dark" : "light")
              }}
              className="excalidraw-button"
              style={{
                padding: "0.375rem",
                minWidth: "1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.text,
              }}
              title="Toggle theme"
            >
              {theme === "light" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={handleCreateDrawing}
              disabled={isCreating}
              className="excalidraw-button"
              style={{
                padding: "0.375rem",
                minWidth: "1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.text,
              }}
              title="New drawing (Cmd+N)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onToggleSidebar}
              className="excalidraw-button"
              style={{
                padding: "0.375rem",
                minWidth: "1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.text,
              }}
              title="Hide sidebar (Cmd+B)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
            <div style={{ position: "relative", zIndex: 10001 }} ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="excalidraw-button"
                style={{
                  padding: "0.375rem",
                  minWidth: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                color: colors.text,
                }}
                title="More options"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
              {showMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "0.25rem",
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "4px",
                    boxShadow: colors.shadowIsland,
                    minWidth: "160px",
                    zIndex: 10000,
                    padding: "0.25rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      toggleSearch()
                      setShowMenu(false)
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.875rem",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: colors.text,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      borderRadius: "2px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.backgroundSecondary
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    Search (Cmd+K)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleGraph()
                      setShowMenu(false)
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.875rem",
                      border: "none",
                      background: isGraphView ? colors.backgroundSecondary : "transparent",
                      cursor: "pointer",
                      color: colors.text,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      borderRadius: "2px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.backgroundSecondary
                    }}
                    onMouseLeave={(e) => {
                      if (!isGraphView) {
                        e.currentTarget.style.backgroundColor = "transparent"
                      }
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                    Graph view (Cmd+G)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Input - Conditional */}
        {showSearch && (
          <div style={{ padding: "0.5rem 1rem" }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search drawings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded border"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                color: colors.text,
              }}
            />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="mx-4 mt-2 px-3 py-2 rounded"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid #ef4444",
            color: "#ef4444",
          }}
        >
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Tree View */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--excalidraw-border) transparent",
        }}
      >
        {filteredTree.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              {searchQuery ? "No drawings found" : "No drawings yet"}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {filteredTree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                level={0}
                activeId={activeDrawingId}
                onSelect={handleSelectDrawing}
                onDragStart={dragAndDrop.handleDragStart}
                onDragOver={dragAndDrop.handleDragOver}
                onDrop={handleDrop}
                onDragEnd={dragAndDrop.handleDragEnd}
                draggedId={dragAndDrop.draggedId}
                dragOverId={dragAndDrop.dragOverId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface TreeNodeProps {
  node: DrawingTreeNode
  level: number
  activeId: string | null
  onSelect: (id: string) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (draggedId: string, targetId: string | null) => void
  onDragEnd: () => void
  draggedId: string | null
  dragOverId: string | null
}

function TreeNodeMenu({
  isOpen,
  hasChildren,
  onCreateChild,
  onDelete,
}: {
  isOpen: boolean
  hasChildren: boolean
  onCreateChild: () => void
  onDelete: () => void
}) {
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)
  
  if (!isOpen) return null

  return (
    <div
      role="menu"
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        marginTop: "0.25rem",
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: "6px",
        boxShadow: colors.shadowIsland,
        minWidth: "160px",
        zIndex: 10000,
        padding: "0.25rem",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onCreateChild}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "0.5rem 0.75rem",
          fontSize: "0.875rem",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: colors.text,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          borderRadius: "2px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.backgroundSecondary
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Create Child
      </button>

      <div
        style={{
          height: "1px",
          backgroundColor: "var(--excalidraw-border)",
          margin: "0.25rem 0",
        }}
      />

      <button
        type="button"
        onClick={onDelete}
        disabled={hasChildren}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "0.5rem 0.75rem",
          fontSize: "0.875rem",
          border: "none",
          background: "transparent",
          cursor: hasChildren ? "not-allowed" : "pointer",
          color: hasChildren ? "var(--excalidraw-text-secondary)" : "#ef4444",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          borderRadius: "2px",
          opacity: hasChildren ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!hasChildren) {
            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        Delete
      </button>
    </div>
  )
}

function DeleteConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)
  
  if (!isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
                color: colors.text,
        zIndex: 999999,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          padding: "1.5rem",
          maxWidth: "400px",
          boxShadow: colors.shadowIsland,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: 600, color: colors.text }}>
          Delete Drawing?
        </h3>
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: colors.textSecondary }}>
          This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              border: "1px solid var(--excalidraw-border)",
              borderRadius: "4px",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              border: "none",
              borderRadius: "4px",
              backgroundColor: "#ef4444",
              color: "white",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function TreeNode({ 
  node, 
  level, 
  activeId, 
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggedId,
  dragOverId,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(node.title)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const hasChildren = node.children && node.children.length > 0
  const isActive = activeId === node.id
  const isDragging = draggedId === node.id
  const isDragOver = dragOverId === node.id
  const { setTree } = useTreeStore()
  const { setActiveDrawingId } = useDrawingStore()
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log("[TreeNode] Double click, entering edit mode for:", node.id)
    setIsEditing(true)
  }

  const handleSaveTitle = async () => {
    const newTitle = editedTitle.trim() || node.title
    if (newTitle !== node.title) {
      console.log("[TreeNode] Saving new title:", newTitle, "for:", node.id)
      try {
        await repository.updateDrawingTitle(node.id, newTitle)
        const updatedTree = await repository.getDrawingsTree()
        const { setTree } = useTreeStore.getState()
        setTree(updatedTree)
        console.log("[TreeNode] Title updated successfully")
      } catch (err) {
        console.error("[TreeNode] Failed to update title:", err)
        setEditedTitle(node.title)
      }
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle()
    } else if (e.key === "Escape") {
      setEditedTitle(node.title)
      setIsEditing(false)
    }
  }

  const handleCreateChild = async () => {
    console.log("[TreeNode] Creating child for:", node.id)
    setIsMenuOpen(false)
    try {
      const childId = await repository.createDrawing("New Drawing", node.id)
      await repository.saveDrawing(childId, {
        content: {
          elements: [],
          appState: {},
          files: {},
        },
      })
      const updatedTree = await repository.getDrawingsTree()
      setTree(updatedTree)
      setActiveDrawingId(childId)
      console.log("[TreeNode] Child created successfully:", childId)
    } catch (err) {
      console.error("[TreeNode] Failed to create child:", err)
    }
  }

  const handleDelete = async () => {
    if (hasChildren) {
      alert("Cannot delete a drawing with children")
      setIsMenuOpen(false)
      return
    }
    setShowDeleteConfirm(true)
    setIsMenuOpen(false)
  }

  const confirmDelete = async () => {
    console.log("[TreeNode] Deleting drawing:", node.id)
    try {
      await repository.deleteDrawing(node.id)
      const updatedTree = await repository.getDrawingsTree()
      setTree(updatedTree)
      if (activeId === node.id) {
        setActiveDrawingId(null)
      }
      console.log("[TreeNode] Drawing deleted successfully")
    } catch (err) {
      console.error("[TreeNode] Failed to delete drawing:", err)
    }
    setShowDeleteConfirm(false)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [isMenuOpen])

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        draggable={!isEditing}
        onDragStart={(e) => onDragStart(e, node.id)}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (draggedId && draggedId !== node.id) {
            onDrop(draggedId, node.id)
          }
        }}
        onDragEnd={onDragEnd}
        className="flex items-center gap-2 py-1.5 px-4 transition-colors group"
        style={{
          paddingLeft: `${level * 1.25 + 1}rem`,
          backgroundColor: isDragOver 
            ? "rgba(99, 102, 241, 0.1)" 
            : isActive 
            ? "var(--excalidraw-bg-secondary)" 
            : "transparent",
          borderLeft: isActive
            ? "2px solid var(--excalidraw-button-primary)"
            : "2px solid transparent",
          borderTop: "none",
          borderRight: "none",
          borderBottom: "none",
          opacity: isDragging ? 0.5 : 1,
          cursor: isDragging ? "grabbing" : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = colors.backgroundSecondary
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "transparent"
          }
        }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            style={{
              padding: "0.125rem",
              minWidth: "1rem",
              height: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
                color: colors.text,
              cursor: "pointer",
              border: "none",
              background: "transparent",
            }}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
                color: "var(--excalidraw-text-secondary)",
              }}
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : (
          <div style={{ width: "1rem" }} />
        )}

        {/* Icon and Title - Clickeable area */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!isEditing) {
              onSelect(node.id)
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !isEditing) {
              e.preventDefault()
              onSelect(node.id)
            }
          }}
          onDoubleClick={handleDoubleClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flex: 1,
            cursor: "pointer",
          }}
        >
          {/* Icon */}
          <div
            style={{
              color: isActive ? "#6366f1" : colors.textSecondary,
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <title>File icon</title>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>

          {/* Title */}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-sm flex-1"
              style={{
                color: colors.text,
                backgroundColor: colors.background,
                border: "1px solid #6366f1",
                borderRadius: "2px",
                padding: "2px 4px",
                outline: "none",
                fontWeight: 500,
              }}
            />
          ) : (
            <span
              className="text-sm truncate flex-1"
              style={{
                color: colors.text,
                fontWeight: isActive ? 500 : 400,
              }}
            >
              {node.title}
            </span>
          )}
        </div>

        {/* Menu Button */}
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ position: "relative", zIndex: 10001 }}
          ref={menuRef}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsMenuOpen(!isMenuOpen)
            }}
            style={{
              padding: "0.25rem",
              minWidth: "1.25rem",
              height: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.text,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
            title="More options"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          <TreeNodeMenu
            isOpen={isMenuOpen}
            hasChildren={!!hasChildren}
            onCreateChild={handleCreateChild}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children?.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              activeId={activeId}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              draggedId={draggedId}
              dragOverId={dragOverId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
