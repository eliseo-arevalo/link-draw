import { useEffect } from "react"
import { useTreeStore } from "@/shared/store/treeStore"

export interface CollaborativeExcalidrawElement {
  id: string
  // biome-ignore lint/suspicious/noExplicitAny: Excalidraw elements have dynamic properties
  [key: string]: any
}

export function useCollaborativeCanvas(
  drawingId: string | null,
  onElementsChange: (elements: CollaborativeExcalidrawElement[]) => void
) {
  const { syncProvider, isCollaborating } = useTreeStore()

  useEffect(() => {
    if (!isCollaborating || !syncProvider || !drawingId) return

    const doc = syncProvider.getDoc()
    if (!doc) return

    // Create Yjs map for this specific drawing
    const yElements = doc.getMap(`drawing-${drawingId}`)

    // Observe remote changes
    const observer = () => {
      const elements = Array.from(yElements.values()) as CollaborativeExcalidrawElement[]
      // Only update if we have elements (avoid clearing on empty init)
      if (elements.length > 0) {
        onElementsChange(elements)
      }
    }

    yElements.observe(observer)

    // Initial sync
    observer()

    return () => {
      yElements.unobserve(observer)
    }
  }, [drawingId, syncProvider, isCollaborating, onElementsChange])

  // Function to broadcast local changes
  const broadcastElements = (elements: CollaborativeExcalidrawElement[]) => {
    if (!isCollaborating || !syncProvider || !drawingId) return
    const doc = syncProvider.getDoc()
    if (!doc) return

    const yElements = doc.getMap(`drawing-${drawingId}`)

    doc.transact(() => {
      // Clear and update strategy for MVP
      yElements.clear()
      for (const element of elements) {
        yElements.set(element.id, element)
      }
    })
  }

  return { broadcastElements }
}
