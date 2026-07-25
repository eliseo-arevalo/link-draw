import { Icon } from "@/shared/components/Icon"
import type { DrawingTreeNode } from "@/shared/types/drawing"

interface WikiLinkAutocompleteProps {
  query: string
  drawings: DrawingTreeNode[]
  onSelect: (drawing: DrawingTreeNode) => void
  textColor: string
  bgColor: string
  borderColor: string
  hoverBg: string
}

export function WikiLinkAutocomplete({
  query,
  drawings,
  onSelect,
  textColor,
  bgColor,
  borderColor,
  hoverBg,
}: WikiLinkAutocompleteProps) {
  const filtered = drawings.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))

  return (
    <div
      className="rounded-lg shadow-xl overflow-hidden border my-1"
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        maxHeight: "220px",
      }}
    >
      <div
        className="px-3 py-1.5 text-xs font-semibold uppercase border-b flex items-center gap-1.5"
        style={{
          color: "var(--color-accent, #6366f1)",
          borderColor: borderColor,
          backgroundColor: "rgba(99, 102, 241, 0.08)",
        }}
      >
        <Icon name="file" size={12} color="var(--color-accent, #6366f1)" />
        <span>Wiki Link Autocomplete: [[{query}]]</span>
      </div>

      <div className="overflow-y-auto max-h-[170px] py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-3 text-xs opacity-60 text-center" style={{ color: textColor }}>
            No matching drawings found for "[[{query}]]"
          </div>
        ) : (
          filtered.map((drawing) => (
            <button
              key={drawing.id}
              type="button"
              onClick={() => onSelect(drawing)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-left w-full cursor-pointer transition-colors"
              style={{ color: textColor }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = hoverBg
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
              }}
            >
              <Icon name="file" size={14} color={textColor} />
              <span className="flex-1 truncate font-medium">{drawing.title}</span>
              <span className="text-[10px] opacity-60">Press ↵</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
