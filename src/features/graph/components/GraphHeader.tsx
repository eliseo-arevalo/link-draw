import { Icon } from "@/shared/components/Icon"
import { getThemeColors } from "@/shared/styles/theme"
import type { GraphStats } from "@/shared/types/graph"

type LayoutType = "cose" | "breadthfirst" | "circle" | "grid" | "concentric"

interface GraphHeaderProps {
  theme: "light" | "dark"
  layout: LayoutType
  searchQuery: string
  stats: GraphStats
  layouts: Record<LayoutType, { name: string; description: string }>
  onLayoutChange: (layout: LayoutType) => void
  onSearchChange: (query: string) => void
  onRefresh: () => void
}

export function GraphHeader({
  theme,
  layout,
  searchQuery,
  stats,
  layouts,
  onLayoutChange,
  onSearchChange,
  onRefresh,
}: GraphHeaderProps) {
  const colors = getThemeColors(theme)

  return (
    <div
      className="border-b"
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
      }}
    >
      {/* Top Row: Layout, Search, Refresh */}
      <div className="px-4 py-2 flex items-center gap-3">
        {/* Layout Selector */}
        <div className="flex items-center gap-2">
          <Icon name="box" size={16} color={colors.textSecondary} />
          <select
            value={layout}
            onChange={(e) => onLayoutChange(e.target.value as LayoutType)}
            className="text-sm px-2 py-1 rounded border cursor-pointer"
            style={{
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
              minWidth: "140px",
            }}
          >
            {(Object.keys(layouts) as LayoutType[]).map((key) => (
              <option key={key} value={key}>
                {layouts[key].name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1" style={{ maxWidth: "300px" }}>
          <Icon name="search" size={16} color={colors.textSecondary} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search nodes..."
            className="text-sm px-3 py-1.5 rounded border flex-1"
            style={{
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="text-xs"
              style={{ color: colors.textSecondary }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          className="excalidraw-button px-3 py-1.5 flex items-center gap-2"
          style={{
            backgroundColor: colors.background,
            color: colors.text,
            borderColor: colors.border,
          }}
          title="Refresh graph"
        >
          <span style={{ fontSize: "16px" }}>↻</span>
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Bottom Row: Stats */}
      <div
        className="px-4 py-2 flex items-center gap-4 border-t"
        style={{ borderColor: colors.border }}
      >
        {/* Stats */}
        <div className="flex items-center gap-3 text-xs" style={{ color: colors.textSecondary }}>
          <div className="flex items-center gap-1">
            <span style={{ fontWeight: 600 }}>{stats.nodes}</span>
            <span>nodes</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span style={{ fontWeight: 600 }}>{stats.edges}</span>
            <span>edges</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span style={{ fontWeight: 600 }}>{stats.orphans}</span>
            <span>orphans</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span>depth</span>
            <span style={{ fontWeight: 600 }}>{stats.maxDepth}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
