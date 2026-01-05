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
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
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
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        Delete
      </button>
    </div>
  )
}
