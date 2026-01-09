import { useEffect, useRef, useState } from "react"
import { Icon } from "@/shared/components/Icon"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useThemeStore } from "@/shared/store/themeStore"
import { useViewStore } from "@/shared/store/viewStore"
import { getThemeColors } from "@/shared/styles/theme"

interface SearchResult {
  drawingId: string
  drawingTitle: string
  matchType: "title" | "text" | "label"
  matchText: string
  preview: string
}

export function GlobalSearch() {
  const { repository } = useServices()
  const { theme } = useThemeStore()
  const { setActiveDrawingId } = useDrawingStore()
  const { setViewMode } = useViewStore()
  const colors = getThemeColors(theme)

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut: Cmd+Shift+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
        setQuery("")
        setResults([])
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Search in all drawings
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const searchInTitle = (
      drawing: { id: string; title: string },
      lowerQuery: string
    ): SearchResult | null => {
      if (drawing.title.toLowerCase().includes(lowerQuery)) {
        return {
          drawingId: drawing.id,
          drawingTitle: drawing.title,
          matchType: "title",
          matchText: drawing.title,
          preview: drawing.title,
        }
      }
      return null
    }

    const createTextMatch = (
      drawing: { id: string; title: string },
      text: string
    ): SearchResult => ({
      drawingId: drawing.id,
      drawingTitle: drawing.title,
      matchType: "text",
      matchText: text,
      preview: text.length > 60 ? `${text.substring(0, 60)}...` : text,
    })

    const createLabelMatch = (
      drawing: { id: string; title: string },
      label: string
    ): SearchResult => ({
      drawingId: drawing.id,
      drawingTitle: drawing.title,
      matchType: "label",
      matchText: label,
      preview: label,
    })

    const searchInElements = (
      drawing: { id: string; title: string; content?: { elements?: readonly unknown[] } },
      lowerQuery: string
    ): SearchResult[] => {
      const results: SearchResult[] = []

      if (!drawing.content?.elements) return results

      for (const element of drawing.content.elements) {
        const text = (element as { text?: string }).text
        if (text?.toLowerCase().includes(lowerQuery)) {
          results.push(createTextMatch(drawing, text))
        }

        const label = (element as { label?: { text?: string } }).label?.text
        if (label?.toLowerCase().includes(lowerQuery)) {
          results.push(createLabelMatch(drawing, label))
        }
      }

      return results
    }

    const searchDrawings = async () => {
      const drawings = await repository.listDrawings()
      const lowerQuery = query.toLowerCase()
      const foundResults: SearchResult[] = []

      for (const drawing of drawings) {
        const titleMatch = searchInTitle(drawing, lowerQuery)
        if (titleMatch) foundResults.push(titleMatch)

        const elementMatches = searchInElements(drawing, lowerQuery)
        foundResults.push(...elementMatches)
      }

      setResults(foundResults)
      setSelectedIndex(0)
    }

    searchDrawings()
  }, [query, repository])

  const handleSelectResult = (result: SearchResult) => {
    setActiveDrawingId(result.drawingId)
    setViewMode("canvas")
    setIsOpen(false)
    setQuery("")
    setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      handleSelectResult(results[selectedIndex])
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
        onClick={() => setIsOpen(false)}
      />

      {/* Search Modal */}
      <div
        className="fixed top-[20%] left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-[9999]"
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 p-4 border-b"
          style={{ borderColor: colors.border }}
        >
          <Icon name="search" size={20} color={colors.textSecondary} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search in all drawings... (Cmd+Shift+F)"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: colors.text }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setResults([])
              }}
              style={{ color: colors.textSecondary }}
            >
              <Icon name="x" size={16} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 && query && (
            <div className="p-8 text-center" style={{ color: colors.textSecondary }}>
              No results found for "{query}"
            </div>
          )}

          {results.length === 0 && !query && (
            <div className="p-8 text-center" style={{ color: colors.textSecondary }}>
              <div className="mb-2">Search across all drawings</div>
              <div className="text-sm">Find text in titles, elements, and labels</div>
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={`${result.drawingId}-${index}`}
              type="button"
              onClick={() => handleSelectResult(result)}
              className="w-full text-left p-4 border-b transition-colors"
              style={{
                borderColor: colors.border,
                backgroundColor:
                  index === selectedIndex ? colors.backgroundSecondary : "transparent",
              }}
            >
              <div className="flex items-start gap-3">
                <Icon
                  name={result.matchType === "title" ? "file" : "type"}
                  size={16}
                  color={colors.textSecondary}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium mb-1" style={{ color: colors.text }}>
                    {result.drawingTitle}
                  </div>
                  <div className="text-sm truncate" style={{ color: colors.textSecondary }}>
                    {result.preview}
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                    Match in: {result.matchType}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div
            className="p-3 text-xs flex items-center justify-between border-t"
            style={{
              borderColor: colors.border,
              color: colors.textSecondary,
            }}
          >
            <div>
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </div>
            <div className="flex items-center gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Open</span>
              <span>Esc Close</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
