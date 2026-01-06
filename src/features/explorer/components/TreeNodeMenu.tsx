import { Icon } from "@/shared/components/Icon"

interface TreeNodeMenuProps {
  isOpen: boolean
  hasChildren: boolean
  onCreateChild: () => void
  onDelete: () => void
}

export function TreeNodeMenu({ isOpen, hasChildren, onCreateChild, onDelete }: TreeNodeMenuProps) {
  if (!isOpen) return null

  return (
    <div
      role="menu"
      className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg min-w-[160px] z-[1000] p-1"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onCreateChild}
        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
      >
        <Icon name="plus" size={14} aria-label="Create child" />
        Create Child
      </button>

      <div className="h-px bg-gray-200 my-1" />

      <button
        type="button"
        onClick={onDelete}
        disabled={hasChildren}
        className={`w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 ${
          hasChildren
            ? "text-gray-400 cursor-not-allowed opacity-50"
            : "text-red-500 hover:bg-red-50"
        }`}
      >
        <Icon name="trash" size={14} aria-label="Delete" />
        Delete
      </button>
    </div>
  )
}
