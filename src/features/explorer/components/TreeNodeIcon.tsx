import { Icon } from "@/shared/components/Icon"

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
      <Icon
        name={isExpanded ? "chevronDown" : "chevronRight"}
        size={10}
        className="text-gray-500"
        aria-label={isExpanded ? "Collapse" : "Expand"}
      />
    </button>
  )
}
