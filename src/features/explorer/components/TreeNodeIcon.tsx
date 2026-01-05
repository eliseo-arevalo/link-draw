interface TreeNodeIconProps {
  isExpanded: boolean
  hasChildren: boolean
  onToggle: () => void
}

export function TreeNodeIcon({ isExpanded, hasChildren, onToggle }: TreeNodeIconProps) {
  if (!hasChildren) {
    return <div className="w-4" />
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className="p-0.5 min-w-4 h-4 flex items-center justify-center border-none bg-transparent"
      aria-label={isExpanded ? "Collapse" : "Expand"}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}
