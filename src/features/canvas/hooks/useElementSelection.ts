import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { useEffect, useState } from "react"
import type { ExcalidrawAdapter } from "@/shared/adapters/excalidraw/ExcalidrawAdapter"

export function useElementSelection(
  excalidrawAPI: ExcalidrawImperativeAPI | null,
  adapter: ExcalidrawAdapter
) {
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([])

  useEffect(() => {
    if (!excalidrawAPI) return

    const interval = setInterval(() => {
      const ids = adapter.getSelectedElementIds()
      setSelectedElementIds((prev) => {
        if (prev.length !== ids.length || !prev.every((id, i) => id === ids[i])) {
          return ids
        }
        return prev
      })
    }, 100)

    return () => clearInterval(interval)
  }, [excalidrawAPI, adapter])

  return { selectedElementIds, hasSelection: selectedElementIds.length > 0 }
}
