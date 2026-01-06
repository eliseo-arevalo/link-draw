import { useEffect, useRef, useState } from "react"
import { Icon } from "@/shared/components/Icon"
import { SIDEBAR_WIDTH } from "@/shared/constants/layout"
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useThemeStore } from "@/shared/store/themeStore"
import { useTreeStore } from "@/shared/store/treeStore"
import { getThemeColors } from "@/shared/styles/theme"
import type { DrawingTreeNode } from "@/shared/types/drawing"
import { TreeNode } from "./components/TreeNode"
import { useDragAndDrop } from "./hooks/useDragAndDrop"

interface DrawingsExplorerProps {
  isCollapsed: boolean
  onToggleSidebar: () => void
  onToggleGraph: () => void
  isGraphView: boolean
}

export function Explorer({
  isCollapsed,
  onToggleSidebar,
  onToggleGraph,
  isGraphView,
}: DrawingsExplorerProps) {
  const { drawingService, repository } = useServices()
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
  }, [setTree, repository.getDrawingsTree])

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
          <Icon name="sidebar" size={20} aria-label="Show sidebar" />
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
                <Icon name="moon" aria-label="Toggle theme" />
              ) : (
                <Icon name="sun" aria-label="Toggle theme" />
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
              <Icon name="plus" aria-label="New drawing" />
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
              <Icon name="sidebar" aria-label="Hide sidebar" />
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
                <Icon name="moreVertical" aria-label="More options" />
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
                    <Icon name="search" size={14} aria-label="Search" />
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
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      role="img"
                      aria-label="Icon"
                    >
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
        onDragOver={(e) => {
          if (dragAndDrop.draggedId) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (dragAndDrop.draggedId) {
            // Drop on root (no parent)
            handleDrop(dragAndDrop.draggedId, null)
          }
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
