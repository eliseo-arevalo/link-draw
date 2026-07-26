import { Icon } from "@/shared/components/Icon"
import { getThemeColors } from "@/shared/styles/theme"

type LayoutType = "cose" | "breadthfirst" | "circle" | "grid" | "concentric"

interface GraphHeaderProps {
  theme: "light" | "dark"
  layout: LayoutType
  searchQuery: string
  layouts: Record<LayoutType, { name: string; description: string }>
  onLayoutChange: (layout: LayoutType) => void
  onSearchChange: (query: string) => void
  onRefresh: () => void
}

export function GraphHeader({
  theme,
  layout,
  searchQuery,
  layouts,
  onLayoutChange,
  onSearchChange,
  onRefresh,
}: GraphHeaderProps) {
  const colors = getThemeColors(theme)

  return (
    <header
      className="border-b px-4 py-3"
      style={{ backgroundColor: colors.background, borderColor: colors.border }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:mr-auto sm:min-w-36 sm:w-auto">
          <h1 className="text-sm font-semibold" style={{ color: colors.text }}>
            Graph view
          </h1>
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            Explore relationships between drawings
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
          <Icon name="box" size={15} color={colors.textSecondary} />
          <span className="sr-only">Layout</span>
          <select
            value={layout}
            aria-label="Graph layout"
            onChange={(e) => onLayoutChange(e.target.value as LayoutType)}
            className="rounded-md border px-2.5 py-2 text-sm outline-none cursor-pointer"
            style={{ backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }}
          >
            {(Object.keys(layouts) as LayoutType[]).map((key) => (
              <option key={key} value={key}>
                {layouts[key].name}
              </option>
            ))}
          </select>
        </label>

        <div
          className="flex min-w-0 w-full flex-1 items-center gap-2 rounded-md border px-2.5 py-2 sm:min-w-52 sm:w-auto"
          style={{ backgroundColor: colors.backgroundSecondary, borderColor: colors.border, maxWidth: "360px" }}
        >
          <Icon name="search" size={15} color={colors.textSecondary} />
          <input
            type="search"
            aria-label="Search drawings in graph"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Find a drawing"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            style={{ color: colors.text }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="rounded p-0.5 cursor-pointer"
              style={{ color: colors.textSecondary }}
              aria-label="Clear graph search"
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium cursor-pointer"
          style={{ backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }}
          title="Refresh graph"
        >
          <span aria-hidden="true">↻</span>
          Refresh
        </button>
      </div>

    </header>
  )
}
