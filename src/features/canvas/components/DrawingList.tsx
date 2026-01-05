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
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
            className="text-gray-500"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="flex-1 text-sm truncate">{drawing.title}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className="text-gray-500 opacity-50"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      ))}
    </div>
  )
}
