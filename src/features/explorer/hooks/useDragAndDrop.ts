import { useState } from "react"

export function useDragAndDrop() {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = "all"
    e.dataTransfer.setData("text/plain", id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    if (draggedId !== id) {
      setDragOverId(id)
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  return {
    draggedId,
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
