import { useCallback, useEffect, useState } from "react"
import { LocalStorageRepository } from "@/shared/repositories/localStorage/LocalStorageRepository"
import type { Drawing, DrawingTreeNode } from "@/shared/types/drawing"
import { DrawingList } from "./DrawingList"
import { ElementList } from "./ElementList"
import { ModalHeader } from "./ModalHeader"
import { SearchInput } from "./SearchInput"

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

  const headerTitle = selectedDrawing ? selectedDrawing.title : "Link to Drawing"
  const headerSubtitle = selectedDrawing
    ? "Choose how to link to this drawing"
    : "Select a drawing to create a link"

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        role="document"
        className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl"
        style={{ zIndex: Z_INDEX.MODAL_CONTENT }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <ModalHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          onBack={selectedDrawing ? handleBack : undefined}
        />

        {!selectedDrawing && (
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search drawings..."
          />
        )}

        <div className="flex-1 overflow-y-auto mb-4 min-h-[200px]">
          {isLoading || isLoadingElements ? (
            <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
          ) : selectedDrawing ? (
            <ElementList
              elements={elements}
              onSelectElement={handleSelectElement}
              onSelectWholeDrawing={handleSelectWholeDrawing}
            />
          ) : (
            <DrawingList drawings={filteredDrawings} onSelect={handleDrawingSelect} />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={selectedDrawing ? handleBack : onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {selectedDrawing ? "Back" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  )
}
