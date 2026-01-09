import { useCallback, useState } from "react"
import type { ExcalidrawAdapter } from "@/shared/adapters/excalidraw/ExcalidrawAdapter"
import { isDrawingLink, parseDrawingLink } from "@/shared/lib/drawing-links"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"

type OnLinkOpenHandler = (
  element: { link: string | null },
  event: CustomEvent<{ nativeEvent: MouseEvent | React.PointerEvent<HTMLCanvasElement> }>
) => void

export function useLinkNavigation(adapter: ExcalidrawAdapter) {
  const { setActiveDrawingId } = useDrawingStore()
  const { repository } = useServices()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLinkOpen: OnLinkOpenHandler = useCallback(
    async (element, event) => {
      const link = element.link
      if (!link || !isDrawingLink(link)) return

      event.preventDefault()

      const parsed = parseDrawingLink(link)
      if (!parsed) return

      // Validar que el drawing existe
      const drawing = await repository.loadDrawing(parsed.drawingId)
      if (!drawing) {
        console.warn("[Canvas] Drawing not found:", parsed.drawingId)
        setErrorMessage("This drawing no longer exists")
        return
      }

      console.log("[Canvas] Navigating to drawing:", parsed.drawingId)
      setActiveDrawingId(parsed.drawingId)

      if (parsed.type === "element") {
        setTimeout(() => {
          adapter.scrollToElement(parsed.elementId)
          adapter.highlightElement(parsed.elementId)
        }, 500)
      }
    },
    [setActiveDrawingId, adapter, repository]
  )

  return { handleLinkOpen, errorMessage, clearError: () => setErrorMessage(null) }
}
