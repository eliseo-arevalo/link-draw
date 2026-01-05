import { useEffect, useRef, useState } from "react"
import { LocalStorageRepository } from "@/shared/repositories/localStorage/LocalStorageRepository"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useTreeStore } from "@/shared/store/treeStore"
import type { DrawingTreeNode } from "@/shared/types/drawing"

const repository = new LocalStorageRepository()

export function DrawingsExplorer() {
  const { tree, setTree } = useTreeStore()
  const { activeDrawingId, setActiveDrawingId } = useDrawingStore()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div
      className="h-full flex flex-col"
      style={{
        width: "280px",
        minWidth: "280px",
        backgroundColor: "var(--excalidraw-bg-primary)",
        borderRight: "1px solid var(--excalidraw-border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b"
        style={{
          borderColor: "var(--excalidraw-border)",
          minHeight: "3rem",
          padding: "0 1rem",
        }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--excalidraw-text-primary)" }}>
          EXPLORADOR
        </h2>
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
          }}
          title="Nuevo dibujo"
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
            aria-label="Plus icon"
          >
            <title>Nuevo dibujo</title>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
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
        {tree.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--excalidraw-text-secondary)" }}>
              No hay dibujos aún
            </p>
          </div>
        ) : (
          <div className="py-2">
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                level={0}
                activeId={activeDrawingId}
                onSelect={handleSelectDrawing}
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
  if (!isOpen) return null

  return (
    <div
      role="menu"
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        marginTop: "0.25rem",
        backgroundColor: "var(--excalidraw-bg-primary)",
        border: "1px solid var(--excalidraw-border)",
        borderRadius: "6px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        minWidth: "160px",
        zIndex: 1000,
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
          color: "var(--excalidraw-text-primary)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          borderRadius: "2px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--excalidraw-bg-secondary)"
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
  if (!isOpen) return null

  return (
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
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "var(--excalidraw-bg-primary)",
          border: "1px solid var(--excalidraw-border)",
          borderRadius: "8px",
          padding: "1.5rem",
          maxWidth: "400px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: 600 }}>
          Delete Drawing?
        </h3>
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "#666" }}>
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
    </div>
  )
}

function TreeNode({ node, level, activeId, onSelect }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(node.title)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const hasChildren = node.children && node.children.length > 0
  const isActive = activeId === node.id
  const { setTree } = useTreeStore()
  const { setActiveDrawingId } = useDrawingStore()

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
    <div>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        className="flex items-center gap-2 py-1.5 px-4 transition-colors group"
        style={{
          paddingLeft: `${level * 1.25 + 1}rem`,
          backgroundColor: isActive ? "var(--excalidraw-bg-secondary)" : "transparent",
          borderLeft: isActive
            ? "2px solid var(--excalidraw-button-primary)"
            : "2px solid transparent",
          borderTop: "none",
          borderRight: "none",
          borderBottom: "none",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "var(--excalidraw-bg-secondary)"
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
              color: isActive
                ? "var(--excalidraw-button-primary)"
                : "var(--excalidraw-text-secondary)",
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
                color: "var(--excalidraw-text-primary)",
                backgroundColor: "var(--excalidraw-bg-primary)",
                border: "1px solid var(--excalidraw-button-primary)",
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
                color: "var(--excalidraw-text-primary)",
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
          style={{ position: "relative" }}
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
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--excalidraw-text-secondary)",
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
