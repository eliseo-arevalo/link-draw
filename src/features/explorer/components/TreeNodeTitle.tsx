import { useState, useRef } from "react"
import type { KeyboardEvent } from "react"

interface TreeNodeTitleProps {
  title: string
  isEditing: boolean
  onSave: (newTitle: string) => void
  onCancel: () => void
}

export function TreeNodeTitle({ title, isEditing, onSave, onCancel }: TreeNodeTitleProps) {
  const [editedTitle, setEditedTitle] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      onSave(editedTitle.trim() || title)
    } else if (e.key === "Escape") {
      setEditedTitle(title)
      onCancel()
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editedTitle}
        onChange={(e) => setEditedTitle(e.target.value)}
        onBlur={() => onSave(editedTitle.trim() || title)}
        onKeyDown={handleKeyDown}
        className="flex-1 px-2 py-1 text-sm border border-blue-500 rounded outline-none"
      />
    )
  }

  return <span className="flex-1 text-sm truncate">{title}</span>
}
