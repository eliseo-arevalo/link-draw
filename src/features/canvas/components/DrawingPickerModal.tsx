import { useCallback, useEffect, useState } from "react"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"
import type { Drawing, DrawingTreeNode } from "@/shared/types/drawing"
import { DrawingList } from "./DrawingList"
import { ElementList } from "./ElementList"
import { ModalHeader } from "./ModalHeader"
import { SearchInput } from "./SearchInput"

const Z_INDEX = {
  MODAL_BACKDROP: 300,
  MODAL_CONTENT: 301,
}

const loadDrawingElements = async (drawing: DrawingTreeNode, repository: IGraphRepository) => {
  const fullDrawing = await repository.loadDrawing(drawing.id)
  if (!fullDrawing) return null

  const linkableElements = (fullDrawing.content.elements || [])
    .filter((el: { id: string; type: string; isDeleted?: boolean }) => !el.isDeleted)
    .map((el: { id: string; type: string; text?: string; name?: string }) => ({
      id: el.id,
      type: el.type,
      text: el.text,
      name: el.name,
    }))

  return { drawing: fullDrawing, elements: linkableElements }
}

interface ElementInfo {
  id: string
  type: string
  text?: string
  name?: string
}

interface DrawingPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (drawingId: string, drawingTitle: string, elementId?: string) => void
  onSelectUrl?: (url: string) => void
  currentDrawingId: string | null
}

export function DrawingPickerModal({
  isOpen,
  onClose,
  onSelect,
  onSelectUrl,
  currentDrawingId,
}: DrawingPickerModalProps) {
  const { repository } = useServices()
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)
  const [tree, setTree] = useState<DrawingTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null)
  const [elements, setElements] = useState<ElementInfo[]>([])
  const [isLoadingElements, setIsLoadingElements] = useState(false)
  const [urlValue, setUrlValue] = useState("")
  const [activeTab, setActiveTab] = useState<"drawing" | "url">("drawing")

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setSelectedDrawing(null)
      setElements([])
      setSearchQuery("")
      setUrlValue("")
      setActiveTab("drawing")
      repository
        .getDrawingsTree()
        .then(setTree)
        .catch(console.error)
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, repository.getDrawingsTree])

  const handleBack = useCallback(() => {
    setSelectedDrawing(null)
    setElements([])
  }, [])

  const handleSelectWholeDrawing = useCallback(() => {
    if (selectedDrawing) {
      onSelect(selectedDrawing.id, selectedDrawing.title)
    }
  }, [selectedDrawing, onSelect])

  const handleSelectElement = useCallback(
    (elementId: string) => {
      if (selectedDrawing) {
        onSelect(selectedDrawing.id, selectedDrawing.title, elementId)
      }
    },
    [selectedDrawing, onSelect]
  )

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedDrawing) {
          handleBack()
        } else {
          onClose()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, selectedDrawing, handleBack])

  const handleDrawingSelect = async (drawing: DrawingTreeNode) => {
    setIsLoadingElements(true)
    try {
      const result = await loadDrawingElements(drawing, repository)
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

  const handleUrlSubmit = () => {
    if (urlValue.trim() && onSelectUrl) {
      onSelectUrl(urlValue.trim())
      onClose()
    }
  }

  if (!isOpen) return null

  const flattenTree = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
    const result: DrawingTreeNode[] = []
    const traverse = (items: DrawingTreeNode[]) => {
      for (const item of items) {
        result.push(item)
        if (item.children) traverse(item.children)
      }
    }
    traverse(nodes)
    return result
  }

  const allDrawings = flattenTree(tree)
  const filteredDrawings = allDrawings.filter(
    (d) => d.id !== currentDrawingId && d.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const headerTitle = selectedDrawing ? selectedDrawing.title : "Add Link"
  const headerSubtitle = selectedDrawing
    ? "Choose how to link to this drawing"
    : "Link to a drawing or external URL"

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: Z_INDEX.MODAL_BACKDROP,
        backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)",
      }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        role="document"
        className="rounded-xl p-6 w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl"
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          zIndex: Z_INDEX.MODAL_CONTENT,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <ModalHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          onBack={selectedDrawing ? handleBack : undefined}
          textColor={colors.text}
          textSecondaryColor={colors.textSecondary}
          hoverBg={colors.backgroundSecondary}
        />

        {!selectedDrawing && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <button
                type="button"
                onClick={() => setActiveTab("drawing")}
                className="px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === "drawing" ? "#6366f1" : colors.textSecondary,
                  borderBottom:
                    activeTab === "drawing" ? "2px solid #6366f1" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                📄 Drawing
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("url")}
                className="px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === "url" ? "#6366f1" : colors.textSecondary,
                  borderBottom: activeTab === "url" ? "2px solid #6366f1" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                🔗 External URL
              </button>
            </div>

            {activeTab === "drawing" && (
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search drawings..."
                backgroundColor={colors.backgroundSecondary}
                borderColor={colors.border}
                textColor={colors.text}
              />
            )}
          </>
        )}

        <div className="flex-1 overflow-y-auto mb-4 min-h-[200px]">
          {isLoading || isLoadingElements ? (
            <div
              className="flex items-center justify-center h-full"
              style={{ color: colors.textSecondary }}
            >
              Loading...
            </div>
          ) : selectedDrawing ? (
            <ElementList
              elements={elements}
              onSelectElement={handleSelectElement}
              onSelectWholeDrawing={handleSelectWholeDrawing}
              textColor={colors.text}
              textSecondaryColor={colors.textSecondary}
              hoverBg={colors.backgroundSecondary}
              borderColor={colors.border}
            />
          ) : activeTab === "url" ? (
            <div className="flex flex-col gap-4 pt-2">
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Enter the URL you want to link to:
              </p>
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 text-sm rounded-lg outline-none transition-colors"
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                disabled={!urlValue.trim()}
                className="px-4 py-2 text-sm rounded transition-colors font-medium"
                style={{
                  backgroundColor: urlValue.trim() ? "#6366f1" : colors.backgroundSecondary,
                  color: urlValue.trim() ? "#ffffff" : colors.textSecondary,
                  cursor: urlValue.trim() ? "pointer" : "not-allowed",
                  opacity: urlValue.trim() ? 1 : 0.5,
                }}
              >
                Add Link
              </button>
            </div>
          ) : (
            <DrawingList
              drawings={filteredDrawings}
              onSelect={handleDrawingSelect}
              textColor={colors.text}
              hoverBg={colors.backgroundSecondary}
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (selectedDrawing) {
                handleBack()
              } else {
                onClose()
              }
            }}
            className="px-4 py-2 text-sm rounded transition-colors"
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.backgroundSecondary,
              color: colors.text,
            }}
          >
            {selectedDrawing ? "Back" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  )
}
