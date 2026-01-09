import { Icon } from "@/shared/components/Icon"
import type { DrawingTreeNode } from "@/shared/types/drawing"

interface DrawingListProps {
  drawings: DrawingTreeNode[]
  onSelect: (drawing: DrawingTreeNode) => void
  textColor: string
  hoverBg: string
}

export function DrawingList({ drawings, onSelect, textColor, hoverBg }: DrawingListProps) {
  if (drawings.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm"
        style={{ color: textColor, opacity: 0.6 }}
      >
        No drawings available
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {drawings.map((drawing) => (
        <button
          key={drawing.id}
          type="button"
          onClick={() => onSelect(drawing)}
          className="flex items-center gap-3 p-3 rounded-lg transition-colors text-left w-full"
          style={{
            backgroundColor: "transparent",
            color: textColor,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            const target = e.currentTarget
            target.style.backgroundColor = hoverBg
          }}
          onMouseLeave={(e) => {
            const target = e.currentTarget
            target.style.backgroundColor = "transparent"
          }}
        >
          <Icon name="file" size={20} color={textColor} aria-label="Drawing" />
          <span className="flex-1 text-sm truncate">{drawing.title}</span>
          <span style={{ opacity: 0.5 }}>
            <Icon name="chevronRight" color={textColor} aria-label="Select" />
          </span>
        </button>
      ))}
    </div>
  )
}
