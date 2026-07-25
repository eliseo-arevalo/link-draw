import { useCallback, useEffect, useRef, useState } from "react"
import { Icon } from "@/shared/components/Icon"
import { SIDEBAR_WIDTH } from "@/shared/constants/layout"
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts"
import { generateUniqueDrawingName } from "@/shared/lib/drawing-names"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useThemeStore } from "@/shared/store/themeStore"
import { useTreeStore } from "@/shared/store/treeStore"
import { useViewStore } from "@/shared/store/viewStore"
import { getThemeColors } from "@/shared/styles/theme"
import type { DrawingTreeNode } from "@/shared/types/drawing"
import { TreeNode } from "./components/TreeNode"
import { useDragAndDrop } from "./hooks/useDragAndDrop"

interface DrawingsExplorerProps {
  isCollapsed: boolean
  onToggleSidebar: () => void
  onToggleGraph: () => void
  isGraphView: boolean
  isMobile?: boolean
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Sidebar UI rendering requires complex conditional states
export function Explorer({
  isCollapsed,
  onToggleSidebar,
  onToggleGraph,
  isGraphView,
  isMobile = false,
}: DrawingsExplorerProps) {
  const { drawingService, repository } = useServices()
  const { tree, setTree } = useTreeStore()
  const { activeDrawingId, setActiveDrawingId } = useDrawingStore()
  const { setViewMode } = useViewStore()
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
      const uniqueName = generateUniqueDrawingName(tree)
      const id = await repository.createDrawing(uniqueName, null)
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

      // Trigger edit mode for the new drawing
      setTimeout(() => {
        const event = new CustomEvent("edit-node", { detail: { nodeId: id } })
        window.dispatchEvent(event)
      }, 100)
    } catch (err) {
      setError("Failed to create drawing")
      setTimeout(() => setError(null), 5000)
      console.error("Failed to create drawing:", err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectDrawing = (id: string) => {
    console.log("[Sidebar] Selecting drawing:", id)
    setActiveDrawingId(id)
    setViewMode("canvas")
  }

  const handleDrop = async (draggedId: string, targetId: string | null) => {
    try {
      await drawingService.moveDrawing(draggedId, targetId)
      const updatedTree = await repository.getDrawingsTree()
      setTree(updatedTree)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to move drawing"
      setError(errorMsg)
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
    } finally {
      dragAndDrop.handleDragEnd()
    }
  }

  const handleDuplicate = async (id: string, includeChildren: boolean) => {
    try {
      const newId = await repository.duplicateDrawing(id, includeChildren)
      const updatedTree = await repository.getDrawingsTree()
      setTree(updatedTree)
      setActiveDrawingId(newId)
    } catch (err) {
      console.error("[Explorer] Duplicate failed:", err)
      const errorMsg = err instanceof Error ? err.message : "Failed to duplicate drawing"
      setError(errorMsg)
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
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

  // Helper to check if drawing content matches query
  const drawingContentMatches = useCallback(
    async (drawingId: string, query: string): Promise<boolean> => {
      try {
        const drawing = await repository.loadDrawing(drawingId)
        if (!drawing?.content?.elements) return false

        return drawing.content.elements.some((el) => {
          const text = el.text?.toLowerCase() || ""
          const label = el.label?.toLowerCase() || ""
          return text.includes(query) || label.includes(query)
        })
      } catch {
        return false
      }
    },
    [repository]
  )

  // Helper to process a single node
  const processNode = useCallback(
    async (
      node: DrawingTreeNode,
      query: string,
      filterTree: (nodes: DrawingTreeNode[], q: string) => Promise<DrawingTreeNode[]>
    ): Promise<DrawingTreeNode | null> => {
      const lowerQuery = query.toLowerCase()
      const matchesTitle = node.title.toLowerCase().includes(lowerQuery)
      const matchesContent = await drawingContentMatches(node.id, lowerQuery)
      const filteredChildren = node.children ? await filterTree(node.children, query) : []

      if (matchesTitle || matchesContent || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
          metadata: { matchesContent: matchesContent && !matchesTitle },
        }
      }
      return null
    },
    [drawingContentMatches]
  )

  // Filter tree based on search query (searches in titles and content)
  const [filteredTree, setFilteredTree] = useState<DrawingTreeNode[]>(tree)

  useEffect(() => {
    const filterTree = async (
      nodes: DrawingTreeNode[],
      query: string
    ): Promise<DrawingTreeNode[]> => {
      if (!query.trim()) return nodes

      const filtered: DrawingTreeNode[] = []
      for (const node of nodes) {
        const result = await processNode(node, query, filterTree)
        if (result) filtered.push(result)
      }
      return filtered
    }

    filterTree(tree, searchQuery).then(setFilteredTree)
  }, [tree, searchQuery, processNode])

  useEffect(() => {
    let cancelled = false

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Tree loading with last drawing restoration requires conditional logic
    const loadTree = async () => {
      try {
        const drawings = await repository.getDrawingsTree()
        if (!cancelled) {
          setTree(drawings)
          setError(null)

          // Auto-select drawing: last active > single root > first root
          if (!activeDrawingId && drawings.length > 0) {
            // Try to load last active drawing
            const lastDrawingId = localStorage.getItem("linkdraw:last-active-drawing")

            // Check if last drawing still exists
            // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Recursive tree search is inherently complex
            const findDrawing = (nodes: typeof drawings, id: string): boolean => {
              for (const node of nodes) {
                if (node.id === id) return true
                if (node.children && findDrawing(node.children, id)) return true
              }
              return false
            }

            if (lastDrawingId && findDrawing(drawings, lastDrawingId)) {
              setActiveDrawingId(lastDrawingId)
            } else if (drawings.length === 1) {
              // Single root drawing
              setActiveDrawingId(drawings[0].id)
            } else {
              // Multiple roots, select first
              setActiveDrawingId(drawings[0].id)
            }
          }
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
  }, [setTree, repository.getDrawingsTree, activeDrawingId, setActiveDrawingId])

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: resize event triggered on collapse state change
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"))
    }, 150)
    return () => clearTimeout(timer)
  }, [isCollapsed])

  if (isCollapsed) {
    return (
      <div
        className="h-full flex flex-col items-center justify-between"
        style={{
          width: "48px",
          minWidth: "48px",
          backgroundColor: colors.background,
          borderRight: `1px solid ${colors.border}`,
          padding: "0.75rem 0",
          transition: "width 0.15s ease-out, min-width 0.15s ease-out",
          zIndex: 10,
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            style={{
              padding: "0.4rem",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.textSecondary,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.hoverBackground
              e.currentTarget.style.color = colors.text
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = colors.textSecondary
            }}
            title="Expand sidebar (Cmd+B)"
          >
            <Icon name="sidebar" size={16} aria-label="Expand sidebar" />
          </button>

          <button
            type="button"
            onClick={handleCreateDrawing}
            disabled={isCreating}
            style={{
              padding: "0.4rem",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.textSecondary,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.hoverBackground
              e.currentTarget.style.color = colors.text
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = colors.textSecondary
            }}
            title="New drawing (Cmd+N)"
          >
            <Icon name="plus" size={16} aria-label="New drawing" />
          </button>

          <button
            type="button"
            onClick={onToggleGraph}
            style={{
              padding: "0.4rem",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isGraphView ? colors.accent : colors.textSecondary,
              backgroundColor: isGraphView ? colors.activeBackground : "transparent",
              border: "none",
              cursor: "pointer",
            }}
            title="Toggle Graph view (Cmd+G)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              role="img"
              aria-label="Graph view"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </button>
        </div>

        {/* Bottom Theme Quick Toggle */}
        <button
          type="button"
          onClick={() => {
            const { theme: currentTheme, setTheme } = useThemeStore.getState()
            setTheme(currentTheme === "light" ? "dark" : "light")
          }}
          style={{
            padding: "0.4rem",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.textSecondary,
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.hoverBackground
            e.currentTarget.style.color = colors.text
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent"
            e.currentTarget.style.color = colors.textSecondary
          }}
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
        >
          <Icon name={theme === "light" ? "moon" : "sun"} size={16} />
        </button>
      </div>
    )
  }

  const countTotalDrawings = (nodes: DrawingTreeNode[]): number => {
    let count = 0
    for (const node of nodes) {
      count += 1
      if (node.children) count += countTotalDrawings(node.children)
    }
    return count
  }

  const totalDrawings = countTotalDrawings(tree)

  return (
    <div
      className="h-full flex flex-col"
      style={{
        width: `${SIDEBAR_WIDTH}px`,
        minWidth: `${SIDEBAR_WIDTH}px`,
        backgroundColor: colors.background,
        borderRight: `1px solid ${colors.border}`,
        ...(isMobile && {
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
          boxShadow: "2px 0 12px rgba(0, 0, 0, 0.15)",
        }),
        transition: "width 0.15s ease-out, min-width 0.15s ease-out",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${colors.border}`,
          padding: "0.625rem 0.875rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: colors.textSecondary, letterSpacing: "0.06em" }}
            >
              EXPLORER
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: colors.textSecondary,
                opacity: 0.7,
              }}
            >
              ({totalDrawings})
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleCreateDrawing}
              disabled={isCreating}
              style={{
                padding: "0.3rem",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.textSecondary,
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.hoverBackground
                e.currentTarget.style.color = colors.text
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
                e.currentTarget.style.color = colors.textSecondary
              }}
              title="New drawing (Cmd+N)"
            >
              <Icon name="plus" size={14} aria-label="New drawing" />
            </button>
            <button
              type="button"
              onClick={onToggleSidebar}
              style={{
                padding: "0.3rem",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.textSecondary,
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.hoverBackground
                e.currentTarget.style.color = colors.text
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
                e.currentTarget.style.color = colors.textSecondary
              }}
              title="Hide sidebar (Cmd+B)"
            >
              <Icon name="sidebar" size={14} aria-label="Hide sidebar" />
            </button>
            <div style={{ position: "relative", zIndex: 10001 }} ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  padding: "0.3rem",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: colors.textSecondary,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.hoverBackground
                  e.currentTarget.style.color = colors.text
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                  e.currentTarget.style.color = colors.textSecondary
                }}
                title="More options"
              >
                <Icon name="moreVertical" size={14} aria-label="More options" />
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
                    borderRadius: "6px",
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
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.8125rem",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: colors.text,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.hoverBackground
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
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.8125rem",
                      border: "none",
                      background: isGraphView ? colors.activeBackground : "transparent",
                      cursor: "pointer",
                      color: colors.text,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.hoverBackground
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
                  <div
                    style={{ height: "1px", backgroundColor: colors.border, margin: "0.25rem 0" }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const drawings = await repository.listDrawings()
                        const data = {
                          version: "1.0.0",
                          exportDate: new Date().toISOString(),
                          drawings,
                        }
                        const blob = new Blob([JSON.stringify(data, null, 2)], {
                          type: "application/json",
                        })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `linkdraw-export-${Date.now()}.json`
                        a.click()
                        URL.revokeObjectURL(url)
                        setShowMenu(false)
                      } catch (err) {
                        console.error("Export failed:", err)
                        setError("Failed to export project")
                        setTimeout(() => setError(null), 5000)
                      }
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.8125rem",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: colors.text,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.hoverBackground
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                  >
                    <Icon name="download" size={14} aria-label="Export" />
                    Export project
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement("input")
                      input.type = "file"
                      input.accept = "application/json"
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (!file) return

                        try {
                          const text = await file.text()
                          const data = JSON.parse(text)

                          if (!data.drawings || !Array.isArray(data.drawings)) {
                            throw new Error("Invalid file format")
                          }

                          // Clear existing data and import
                          localStorage.setItem("linkdraw:drawings", JSON.stringify(data.drawings))

                          // Reload tree
                          const updatedTree = await repository.getDrawingsTree()
                          setTree(updatedTree)
                          setShowMenu(false)
                          setActiveDrawingId(null)
                        } catch (err) {
                          console.error("Import failed:", err)
                          setError("Failed to import project. Check file format.")
                          setTimeout(() => setError(null), 5000)
                        }
                      }
                      input.click()
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.8125rem",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: colors.text,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.hoverBackground
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                  >
                    <Icon name="upload" size={14} aria-label="Import" />
                    Import project
                  </button>
                  <div
                    style={{ height: "1px", backgroundColor: colors.border, margin: "0.25rem 0" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const { theme: currentTheme, setTheme } = useThemeStore.getState()
                      setTheme(currentTheme === "light" ? "dark" : "light")
                      setShowMenu(false)
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.8125rem",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: colors.text,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.hoverBackground
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                  >
                    <Icon
                      name={theme === "light" ? "moon" : "sun"}
                      size={14}
                      aria-label="Toggle theme"
                    />
                    {theme === "light" ? "Dark" : "Light"} mode
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Embedded Search */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              backgroundColor: colors.inputBg,
              border: `1px solid ${colors.border}`,
              borderRadius: "4px",
              padding: "0.3rem 0.5rem",
            }}
          >
            <Icon name="search" size={13} color={colors.textSecondary} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search drawings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "0.8125rem",
                color: colors.text,
              }}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.1rem",
                  display: "flex",
                  alignItems: "center",
                  color: colors.textSecondary,
                }}
                title="Clear search"
              >
                <Icon name="x" size={12} color={colors.textSecondary} />
              </button>
            ) : (
              <span
                style={{
                  fontSize: "10px",
                  color: colors.textSecondary,
                  opacity: 0.6,
                }}
              >
                ⌘K
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="mx-3 mt-2 px-3 py-1.5 rounded"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#ef4444",
          }}
        >
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Tree View */}
      <div
        className="flex-1 overflow-y-auto px-1"
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
            handleDrop(dragAndDrop.draggedId, null)
          }
        }}
      >
        {filteredTree.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              {searchQuery ? "No matching drawings" : "No drawings yet"}
            </p>
          </div>
        ) : (
          <div className="py-1">
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
                onDuplicate={handleDuplicate}
                draggedId={dragAndDrop.draggedId}
                dragOverId={dragAndDrop.dragOverId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          padding: "0.4rem 0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.backgroundSecondary,
        }}
      >
        <button
          type="button"
          onClick={() => {
            const { theme: currentTheme, setTheme } = useThemeStore.getState()
            setTheme(currentTheme === "light" ? "dark" : "light")
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.2rem 0.4rem",
            borderRadius: "4px",
            fontSize: "0.75rem",
            color: colors.textSecondary,
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.hoverBackground
            e.currentTarget.style.color = colors.text
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent"
            e.currentTarget.style.color = colors.textSecondary
          }}
          title="Toggle theme"
        >
          <Icon name={theme === "light" ? "moon" : "sun"} size={13} />
          <span>{theme === "light" ? "Dark" : "Light"}</span>
        </button>

        <button
          type="button"
          onClick={onToggleGraph}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.2rem 0.4rem",
            borderRadius: "4px",
            fontSize: "0.75rem",
            color: isGraphView ? colors.accent : colors.textSecondary,
            backgroundColor: isGraphView ? colors.activeBackground : "transparent",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            if (!isGraphView) {
              e.currentTarget.style.backgroundColor = colors.hoverBackground
              e.currentTarget.style.color = colors.text
            }
          }}
          onMouseLeave={(e) => {
            if (!isGraphView) {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = colors.textSecondary
            }
          }}
          title="Toggle Graph View (Cmd+G)"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            role="img"
            aria-label="Graph"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span>Graph</span>
        </button>
      </div>
    </div>
  )
}
