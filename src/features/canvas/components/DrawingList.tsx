import { Icon } from "@/shared/components/Icon"
import type { DrawingTreeNode } from "@/shared/types/drawing"

interface DrawingListProps {
  drawings: DrawingTreeNode[]
  onSelect: (drawing: DrawingTreeNode) => void
}

export function DrawingList({ drawings, onSelect }: DrawingListProps) {
  if (drawings.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
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
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left w-full"
        >
          <Icon name="file" size={20} className="text-gray-500" aria-label="Drawing" />
          <span className="flex-1 text-sm truncate">{drawing.title}</span>
          <Icon name="chevronRight" className="text-gray-500 opacity-50" aria-label="Select" />
        </button>
      ))}
    </div>
  )
}
