import { useEffect, useState } from "react"
import { LocalStorageRepository } from "@/shared/repositories/localStorage/LocalStorageRepository"
import type { Drawing, DrawingTreeNode } from "@/shared/types/drawing"

const repository = new LocalStorageRepository()

const Z_INDEX = {
  MODAL_BACKDROP: 300,
  MODAL_CONTENT: 301,
}

const loadDrawingElements = async (drawing: DrawingTreeNode) => {
  const fullDrawing = await repository.loadDrawing(drawing.id)
  if (!fullDrawing) return null

  const linkableElements = (fullDrawing.content.elements || [])
    .filter((el: { id: string; type: string; isDeleted?: boolean }) => !el.isDeleted)
    .map((el: { id: string; type: string }) => ({
      id: el.id,
      type: el.type,
    }))

  return { drawing: fullDrawing, elements: linkableElements }
}

interface ElementInfo {
  id: string
  type: string
}

interface DrawingPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (drawingId: string, drawingTitle: string, elementId?: string) => void
  currentDrawingId: string | null
}

export function DrawingPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentDrawingId,
}: DrawingPickerModalProps) {
  const [tree, setTree] = useState<DrawingTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null)
  const [elements, setElements] = useState<ElementInfo[]>([])
  const [isLoadingElements, setIsLoadingElements] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setSelectedDrawing(null)
      setElements([])
      setSearchQuery("")
      repository
        .getDrawingsTree()
        .then(setTree)
        .catch(console.error)
        .finally(() => setIsLoading(false))
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedDrawing) {
          setSelectedDrawing(null)
          setElements([])
        } else {
          onClose()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, selectedDrawing])

  const handleDrawingSelect = async (drawing: DrawingTreeNode) => {
    setIsLoadingElements(true)
    try {
      const result = await loadDrawingElements(drawing)
      if (result) {
        setSelectedDrawing(result.drawing)
        setElements(result.elements)
      }
    } catch (err) {
      console.error("Failed to load drawing elements:", err)
    } finally {
      setIsLoadingElements(false)
    }
  }

  const handleBack = () => {
    setSelectedDrawing(null)
    setElements([])
  }

  const handleSelectWholeDrawing = () => {
    if (selectedDrawing) {
      onSelect(selectedDrawing.id, selectedDrawing.title)
    }
  }

  const handleSelectElement = (elementId: string) => {
    if (selectedDrawing) {
      onSelect(selectedDrawing.id, selectedDrawing.title, elementId)
    }
  }

  if (!isOpen) return null

  const flattenTree = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
    const result: DrawingTreeNode[] = []
    const traverse = (items: DrawingTreeNode[]) => {
      for (const item of items) {
        result.push(item)
        if (item.children) {
          traverse(item.children)
        }
      }
    }
    traverse(nodes)
    return result
  }

  const allDrawings = flattenTree(tree)
  const filteredDrawings = allDrawings.filter(
    (d) =>
      d.id !== currentDrawingId &&
      d.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getElementIcon = (type: string) => {
    switch (type) {
      case "rectangle":
        return "rect"
      case "ellipse":
        return "oval"
      case "arrow":
        return "arrow"
      case "line":
        return "line"
      case "text":
        return "text"
      case "image":
        return "image"
      case "frame":
        return "frame"
      default:
        return type.slice(0, 4)
    }
  }

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
        zIndex: Z_INDEX.MODAL_BACKDROP,
      }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        role="document"
        style={{
          backgroundColor: "var(--excalidraw-bg-primary, #fff)",
          border: "1px solid var(--excalidraw-border, #e5e5e5)",
          borderRadius: "12px",
          padding: "1.5rem",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
          zIndex: Z_INDEX.MODAL_CONTENT,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {selectedDrawing && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  padding: "0.25rem",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  color: "var(--excalidraw-text-secondary, #666)",
                }}
                aria-label="Back to drawing list"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <h2
              style={{
                margin: 0,
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "var(--excalidraw-text-primary, #1a1a1a)",
              }}
            >
              {selectedDrawing ? selectedDrawing.title : "Link to Drawing"}
            </h2>
          </div>
          <p
            style={{
              margin: "0.5rem 0 0 0",
              fontSize: "0.875rem",
              color: "var(--excalidraw-text-secondary, #666)",
            }}
          >
            {selectedDrawing
              ? "Select a specific element or link to the whole drawing"
              : "Select a drawing to link the selected element to"}
          </p>
        </div>

        {/* Search (only for drawing list) */}
        {!selectedDrawing && (
          <input
            type="text"
            placeholder="Search drawings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
              border: "1px solid var(--excalidraw-border, #e5e5e5)",
              borderRadius: "8px",
              marginBottom: "1rem",
              outline: "none",
              backgroundColor: "var(--excalidraw-bg-secondary, #f5f5f5)",
              color: "var(--excalidraw-text-primary, #1a1a1a)",
              boxSizing: "border-box",
            }}
          />
        )}

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            marginBottom: "1rem",
            minHeight: "200px",
          }}
        >
          {isLoading || isLoadingElements ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--excalidraw-text-secondary, #666)",
              }}
            >
              Loading...
            </div>
          ) : selectedDrawing ? (
            // Element selection view
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {/* Link to whole drawing option */}
              <button
                type="button"
                onClick={handleSelectWholeDrawing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--excalidraw-bg-secondary, #f5f5f5)",
                  border: "2px solid var(--color-primary, #6965db)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  marginBottom: "0.5rem",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-primary, #6965db)"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span
                  style={{
                    flex: 1,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "var(--color-primary, #6965db)",
                  }}
                >
                  Link to whole drawing
                </span>
              </button>

              {elements.length > 0 && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--excalidraw-text-secondary, #666)",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid var(--excalidraw-border, #e5e5e5)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Or select a specific element ({elements.length} elements)
                </div>
              )}

              {elements.map((element) => (
                <button
                  key={element.id}
                  type="button"
                  onClick={() => handleSelectElement(element.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.5rem 1rem",
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--excalidraw-bg-secondary, #f5f5f5)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.625rem",
                      fontFamily: "monospace",
                      padding: "0.125rem 0.375rem",
                      backgroundColor: "var(--excalidraw-bg-secondary, #f5f5f5)",
                      borderRadius: "4px",
                      color: "var(--excalidraw-text-secondary, #666)",
                      textTransform: "uppercase",
                    }}
                  >
                    {getElementIcon(element.type)}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: "0.75rem",
                      color: "var(--excalidraw-text-primary, #1a1a1a)",
                      fontFamily: "monospace",
                    }}
                  >
                    {element.id.slice(0, 12)}...
                  </span>
                </button>
              ))}
            </div>
          ) : filteredDrawings.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--excalidraw-text-secondary, #666)",
                fontSize: "0.875rem",
              }}
            >
              {searchQuery ? "No drawings match your search" : "No other drawings available"}
            </div>
          ) : (
            // Drawing list view
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {filteredDrawings.map((drawing) => (
                <button
                  key={drawing.id}
                  type="button"
                  onClick={() => handleDrawingSelect(drawing)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--excalidraw-bg-secondary, #f5f5f5)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--excalidraw-text-secondary, #666)"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span
                    style={{
                      flex: 1,
                      fontSize: "0.875rem",
                      color: "var(--excalidraw-text-primary, #1a1a1a)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {drawing.title}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--excalidraw-text-secondary, #666)"
                    strokeWidth="2"
                    style={{ opacity: 0.5 }}
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={selectedDrawing ? handleBack : onClose}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              border: "1px solid var(--excalidraw-border, #e5e5e5)",
              borderRadius: "6px",
              backgroundColor: "transparent",
              color: "var(--excalidraw-text-primary, #1a1a1a)",
              cursor: "pointer",
            }}
          >
            {selectedDrawing ? "Back" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  )
}
