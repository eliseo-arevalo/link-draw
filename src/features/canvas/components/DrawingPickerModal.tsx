import { useCallback, useEffect, useReducer, useRef, useState } from "react"
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

interface ModalState {
  searchQuery: string
  selectedDrawing: Drawing | null
  elements: ElementInfo[]
  isLoadingElements: boolean
  urlValue: string
  activeTab: "drawing" | "url"
}

type ModalAction =
  | { type: "RESET" }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_URL_VALUE"; payload: string }
  | { type: "SET_ACTIVE_TAB"; payload: "drawing" | "url" }
  | { type: "START_LOADING_ELEMENTS" }
  | { type: "SET_DRAWING_ELEMENTS"; payload: { drawing: Drawing; elements: ElementInfo[] } }
  | { type: "CLEAR_SELECTED_DRAWING" }
  | { type: "FINISH_LOADING_ELEMENTS" }

const initialModalState: ModalState = {
  searchQuery: "",
  selectedDrawing: null,
  elements: [],
  isLoadingElements: false,
  urlValue: "",
  activeTab: "drawing",
}

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "RESET":
      return initialModalState
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload }
    case "SET_URL_VALUE":
      return { ...state, urlValue: action.payload }
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload }
    case "START_LOADING_ELEMENTS":
      return { ...state, isLoadingElements: true }
    case "SET_DRAWING_ELEMENTS":
      return {
        ...state,
        selectedDrawing: action.payload.drawing,
        elements: action.payload.elements,
        isLoadingElements: false,
      }
    case "CLEAR_SELECTED_DRAWING":
      return { ...state, selectedDrawing: null, elements: [] }
    case "FINISH_LOADING_ELEMENTS":
      return { ...state, isLoadingElements: false }
    default:
      return state
  }
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
  const [state, dispatch] = useReducer(modalReducer, initialModalState)

  const { searchQuery, selectedDrawing, elements, isLoadingElements, urlValue, activeTab } = state

  const searchInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      dispatch({ type: "RESET" })
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

  const handleTabChange = (tab: "drawing" | "url") => {
    dispatch({ type: "SET_ACTIVE_TAB", payload: tab })
    setTimeout(() => {
      if (tab === "drawing") {
        searchInputRef.current?.focus()
      } else if (tab === "url") {
        urlInputRef.current?.focus()
      }
    }, 50)
  }

  const handleBack = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTED_DRAWING" })
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
    dispatch({ type: "START_LOADING_ELEMENTS" })
    try {
      const result = await loadDrawingElements(drawing, repository)
      if (result) {
        dispatch({ type: "SET_DRAWING_ELEMENTS", payload: result })
      } else {
        dispatch({ type: "FINISH_LOADING_ELEMENTS" })
      }
    } catch (err) {
      console.error("Failed to load drawing elements:", err)
      dispatch({ type: "FINISH_LOADING_ELEMENTS" })
    }
  }

  const handleUrlSubmit = () => {
    if (urlValue.trim() && onSelectUrl) {
      onSelectUrl(urlValue.trim())
      onClose()
    }
  }

  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [isOpen])

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
    <dialog
      ref={dialogRef}
      aria-label="Add Link"
      onClose={onClose}
      className="p-0 rounded-xl backdrop:bg-black/50 bg-transparent max-w-md w-full border-0 fixed inset-0 flex items-center justify-center m-auto"
      style={{
        zIndex: Z_INDEX.MODAL_BACKDROP,
      }}
    >
      <div
        role="document"
        className="rounded-xl p-6 w-full max-w-md max-h-[75vh] flex flex-col shadow-2xl"
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          zIndex: Z_INDEX.MODAL_CONTENT,
        }}
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
                onClick={() => handleTabChange("drawing")}
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
                onClick={() => handleTabChange("url")}
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
                  onChange={(val) => dispatch({ type: "SET_SEARCH_QUERY", payload: val })}
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
                onChange={(e) => dispatch({ type: "SET_URL_VALUE", payload: e.target.value })}
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
    </dialog>
  )
}
