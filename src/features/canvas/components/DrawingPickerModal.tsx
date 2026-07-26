import { useCallback, useEffect, useRef, useState } from "react"
import { Icon } from "@/shared/components/Icon"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"
import type { Drawing, DrawingTreeNode } from "@/shared/types/drawing"
import { DrawingList } from "./DrawingList"
import { ElementList } from "./ElementList"
import { ModalHeader } from "./ModalHeader"
import { SearchInput } from "./SearchInput"
import { WikiLinkAutocomplete } from "./WikiLinkAutocomplete"

const Z_INDEX = {
  MODAL_BACKDROP: 300,
  MODAL_CONTENT: 301,
}

const isUrl = (str: string) => {
  const trimmed = str.trim()
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("drawing://") ||
    trimmed.startsWith("excaligraph://") ||
    trimmed.startsWith("www.")
  )
}

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

const loadDrawingElements = async (drawing: DrawingTreeNode, repository: IGraphRepository) => {
  const fullDrawing = await repository.loadDrawing(drawing.id)
  if (!fullDrawing) return null

  const linkableElements: ElementInfo[] = (fullDrawing.content.elements || []).reduce<
    ElementInfo[]
  >((acc, el: { id: string; type: string; isDeleted?: boolean; text?: string; name?: string }) => {
    if (!el.isDeleted) {
      acc.push({
        id: el.id,
        type: el.type,
        text: el.text,
        name: el.name,
      })
    }
    return acc
  }, [])

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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Modal with tabs, tree navigation, and element selection requires complex logic
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

  const searchInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

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

      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, repository.getDrawingsTree])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (activeTab === "drawing") {
          searchInputRef.current?.focus()
        } else if (activeTab === "url") {
          urlInputRef.current?.focus()
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, activeTab])

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

  const onCloseRef = useRef(onClose)
  const selectedDrawingRef = useRef(selectedDrawing)
  const handleBackRef = useRef(handleBack)

  useEffect(() => {
    onCloseRef.current = onClose
    selectedDrawingRef.current = selectedDrawing
    handleBackRef.current = handleBack
  })

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedDrawingRef.current) {
          handleBackRef.current()
        } else {
          onCloseRef.current()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

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

  const cleanSearchQuery = searchQuery.replace(/^\[\[/, "").replace(/\]\]$/, "").trim()
  const isWikiLink = searchQuery.startsWith("[[")

  const allDrawings = flattenTree(tree)
  const filteredDrawings = allDrawings.filter(
    (d) =>
      d.id !== currentDrawingId && d.title.toLowerCase().includes(cleanSearchQuery.toLowerCase())
  )

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const query = searchQuery.trim()
      if (!query) return

      if (isUrl(query) && onSelectUrl) {
        onSelectUrl(query)
        onClose()
      } else if (filteredDrawings.length > 0) {
        handleDrawingSelect(filteredDrawings[0])
      }
    }
  }

  const headerTitle = selectedDrawing ? selectedDrawing.title : "Add Link"
  const headerSubtitle = selectedDrawing
    ? "Choose how to link to this drawing"
    : "Link to a drawing or external URL"

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add Link"
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: Z_INDEX.MODAL_BACKDROP,
        backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.75)" : "rgba(15, 23, 42, 0.4)",
      }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        role="document"
        className="rounded-xl p-6 w-full max-w-md max-h-[75vh] flex flex-col shadow-2xl"
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
          hoverBg={colors.hoverBackground}
        />

        {!selectedDrawing && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <button
                type="button"
                onClick={() => setActiveTab("drawing")}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === "drawing" ? colors.accent : colors.textSecondary,
                  borderBottom:
                    activeTab === "drawing"
                      ? `2px solid ${colors.accent}`
                      : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                <Icon
                  name="file"
                  size={14}
                  color={activeTab === "drawing" ? colors.accent : colors.textSecondary}
                />
                <span>Drawing</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("url")}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === "url" ? colors.accent : colors.textSecondary,
                  borderBottom:
                    activeTab === "url" ? `2px solid ${colors.accent}` : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                <Icon
                  name="link"
                  size={14}
                  color={activeTab === "url" ? colors.accent : colors.textSecondary}
                />
                <span>External URL</span>
              </button>
            </div>

            {activeTab === "drawing" && (
              <>
                <SearchInput
                  inputRef={searchInputRef}
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search drawings, paste URL, or type [[..."
                  backgroundColor={colors.inputBg}
                  borderColor={colors.border}
                  textColor={colors.text}
                />
                {isWikiLink && (
                  <WikiLinkAutocomplete
                    query={cleanSearchQuery}
                    drawings={allDrawings.filter((d) => d.id !== currentDrawingId)}
                    onSelect={handleDrawingSelect}
                    textColor={colors.text}
                    bgColor={colors.backgroundSecondary}
                    borderColor={colors.border}
                    hoverBg={colors.hoverBackground}
                  />
                )}
              </>
            )}
          </>
        )}

        <div className="flex-1 overflow-y-auto mb-4 min-h-[200px]">
          {isLoading || isLoadingElements ? (
            <div
              className="flex items-center justify-center h-full text-sm"
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
              hoverBg={colors.hoverBackground}
              borderColor={colors.border}
            />
          ) : activeTab === "url" ? (
            <div className="flex flex-col gap-4 pt-2">
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Enter or paste the URL you want to link to:
              </p>
              <input
                ref={urlInputRef}
                type="url"
                aria-label="External URL"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition-colors"
                style={{
                  backgroundColor: colors.inputBg,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                disabled={!urlValue.trim()}
                className="px-4 py-2 text-sm rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                style={{
                  backgroundColor: urlValue.trim() ? colors.accent : colors.inputBg,
                  color: urlValue.trim() ? "#ffffff" : colors.textSecondary,
                  cursor: urlValue.trim() ? "pointer" : "not-allowed",
                  opacity: urlValue.trim() ? 1 : 0.6,
                }}
              >
                <Icon
                  name="link"
                  size={14}
                  color={urlValue.trim() ? "#ffffff" : colors.textSecondary}
                />
                <span>Add Link</span>
              </button>
            </div>
          ) : (
            <>
              {isWikiLink && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded mb-2.5 text-xs font-mono"
                  style={{
                    backgroundColor: colors.accentLight,
                    color: colors.accent,
                  }}
                >
                  <Icon name="file" size={12} color={colors.accent} />
                  <span>Wiki link search mode: [[{cleanSearchQuery}]]</span>
                </div>
              )}
              {isUrl(searchQuery) && onSelectUrl && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectUrl(searchQuery.trim())
                    onClose()
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg w-full mb-3 text-left transition-colors text-sm font-medium cursor-pointer"
                  style={{
                    backgroundColor: colors.accentLight,
                    color: colors.accent,
                    border: `1px solid ${colors.accent}`,
                  }}
                >
                  <Icon name="link" size={16} color={colors.accent} />
                  <div className="flex-1 truncate">
                    <span>Link to URL: </span>
                    <span className="font-semibold underline">{searchQuery.trim()}</span>
                  </div>
                  <span className="text-xs opacity-75">Press ↵</span>
                </button>
              )}
              <DrawingList
                drawings={filteredDrawings}
                onSelect={handleDrawingSelect}
                textColor={colors.text}
                hoverBg={colors.hoverBackground}
              />
            </>
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
            className="px-4 py-2 text-sm rounded-lg transition-colors font-medium cursor-pointer"
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.hoverBackground,
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
