import { useCallback, useEffect, useRef, useState } from "react"
import { Icon } from "@/shared/components/Icon"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"
import type { DrawingTreeNode } from "@/shared/types/drawing"

interface GlobalWikiModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectDrawing: (drawingId: string, title: string) => void
  currentDrawingId: string | null
  filterText: string
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

/**
 * Inline autocomplete popover triggered by `[[` while editing text on the Excalidraw canvas.
 *
 * - Driven by Excalidraw's WYSIWYG textarea content via filterText prop.
 * - Positioned directly above or below the Excalidraw WYSIWYG textarea.
 * - Arrow keys navigate, Enter selects, Escape cancels.
 */
export function GlobalWikiModal({
  isOpen,
  onClose,
  onSelectDrawing,
  currentDrawingId,
  filterText,
}: GlobalWikiModalProps) {
  const { repository } = useServices()
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)
  const [tree, setTree] = useState<DrawingTreeNode[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [popoverPos, setPopoverPos] = useState<{
    x: number
    y: number
    placement: "above" | "below"
  } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Load tree on open & reset selected index when filter changes
  useEffect(() => {
    if (isOpen) {
      repository.getDrawingsTree().then(setTree).catch(console.error)
    }
  }, [isOpen, repository.getDrawingsTree])

  const [prevFilterText, setPrevFilterText] = useState(filterText)
  if (prevFilterText !== filterText) {
    setPrevFilterText(filterText)
    setSelectedIndex(0)
  }

  // Position the popover near the WYSIWYG textarea
  useEffect(() => {
    if (!isOpen) {
      setPopoverPos(null)
      return
    }

    const positionNearTextarea = () => {
      const textarea = document.querySelector<HTMLTextAreaElement>(".excalidraw-wysiwyg")
      if (textarea) {
        const rect = textarea.getBoundingClientRect()
        const popoverHeight = 220
        const spaceBelow = window.innerHeight - rect.bottom
        const placement = spaceBelow > popoverHeight + 8 ? "below" : "above"
        setPopoverPos({
          x: Math.max(16, Math.min(rect.left, window.innerWidth - 300)),
          y: placement === "below" ? rect.bottom + 4 : rect.top - 4,
          placement,
        })
      } else {
        // Fallback: center-top of canvas area
        setPopoverPos({
          x: Math.max(16, window.innerWidth / 2 - 140),
          y: 80,
          placement: "below",
        })
      }
    }

    positionNearTextarea()
    const interval = setInterval(positionNearTextarea, 200)
    return () => clearInterval(interval)
  }, [isOpen])

  const allDrawings = flattenTree(tree).filter((d) => d.id !== currentDrawingId)
  const filteredDrawings = allDrawings.filter((d) =>
    d.title.toLowerCase().includes(filterText.toLowerCase())
  )

  // Scroll selected item into view
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedIndex intentionally triggers scroll-into-view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector("[data-selected='true']")
    if (selected) {
      selected.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  const handleSelect = useCallback(
    (drawing: DrawingTreeNode) => {
      onSelectDrawing(drawing.id, drawing.title)
      onClose()
    },
    [onSelectDrawing, onClose]
  )

  // Navigation keyboard handler (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Navigation keyboard handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) =>
          filteredDrawings.length > 0 ? (prev + 1) % filteredDrawings.length : 0
        )
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) =>
          filteredDrawings.length > 0
            ? (prev - 1 + filteredDrawings.length) % filteredDrawings.length
            : 0
        )
      } else if (e.key === "Enter") {
        e.preventDefault()
        e.stopPropagation()
        if (filteredDrawings.length > 0 && selectedIndex < filteredDrawings.length) {
          handleSelect(filteredDrawings[selectedIndex])
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [isOpen, onClose, filteredDrawings, selectedIndex, handleSelect])

  if (!isOpen || !popoverPos) return null

  return (
    <div
      role="listbox"
      aria-label="Link to drawing"
      className="fixed z-[500]"
      style={{
        left: `${popoverPos.x}px`,
        top: `${popoverPos.y}px`,
        width: "280px",
        transform: popoverPos.placement === "above" ? "translateY(-100%)" : undefined,
      }}
    >
      <div
        className="rounded-xl shadow-2xl flex flex-col overflow-hidden border"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
          boxShadow: `0 8px 32px rgba(0,0,0,${theme === "dark" ? "0.5" : "0.15"})`,
        }}
      >
        {/* Header hint — shows [[ badge + current filter text + keyboard shortcuts */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-b"
          style={{ borderColor: colors.border }}
        >
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
            style={{
              backgroundColor: colors.accentLight,
              color: colors.accent,
            }}
          >
            [[
          </span>
          <span
            className="text-[11px] flex-1 truncate"
            style={{
              color: filterText ? colors.text : colors.textSecondary,
              opacity: filterText ? 1 : 0.6,
            }}
          >
            {filterText || "type to filter..."}
          </span>
          <span
            className="text-[10px] opacity-40 font-mono"
            style={{ color: colors.textSecondary }}
          >
            ↑↓ ↵
          </span>
        </div>

        {/* Results list — no input, just the filtered drawings */}
        <div ref={listRef} className="max-h-44 overflow-y-auto p-1">
          {filteredDrawings.length === 0 ? (
            <div
              className="py-3 text-center text-xs opacity-60"
              style={{ color: colors.textSecondary }}
            >
              No matching drawings
            </div>
          ) : (
            filteredDrawings.map((drawing, index) => {
              const isSelected = index === selectedIndex
              return (
                <button
                  key={drawing.id}
                  type="button"
                  data-selected={isSelected}
                  onMouseDown={(event) => {
                    // Keep Excalidraw's WYSIWYG textarea focused until onClick
                    // replaces the wiki query and commits the linked text.
                    event.preventDefault()
                  }}
                  onClick={() => handleSelect(drawing)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left w-full cursor-pointer transition-colors"
                  style={{
                    backgroundColor: isSelected ? colors.hoverBackground : "transparent",
                    color: colors.text,
                  }}
                >
                  <Icon
                    name="file"
                    size={14}
                    color={isSelected ? colors.accent : colors.textSecondary}
                  />
                  <span className="flex-1 truncate font-medium">{drawing.title}</span>
                  {isSelected && (
                    <span
                      className="text-[10px] font-mono opacity-60"
                      style={{ color: colors.accent }}
                    >
                      ↵
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
