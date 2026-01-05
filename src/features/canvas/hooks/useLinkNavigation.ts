import { useCallback } from "react"
import type { ExcalidrawAdapter } from "@/shared/adapters/excalidraw/ExcalidrawAdapter"
import { isDrawingLink, parseDrawingLink } from "@/shared/lib/drawing-links"
import { useDrawingStore } from "@/shared/store/drawingStore"

type OnLinkOpenHandler = (
  element: { link: string | null },
  event: CustomEvent<{ nativeEvent: MouseEvent | React.PointerEvent<HTMLCanvasElement> }>
) => void

export function useLinkNavigation(adapter: ExcalidrawAdapter) {
  const { setActiveDrawingId } = useDrawingStore()

  const handleLinkOpen: OnLinkOpenHandler = useCallback(
    (element, event) => {
      const link = element.link
      if (!link || !isDrawingLink(link)) return

      event.preventDefault()

      const parsed = parseDrawingLink(link)
      if (!parsed) return

      console.log("[Canvas] Navigating to drawing:", parsed.drawingId)
      setActiveDrawingId(parsed.drawingId)

      if (parsed.type === "element") {
        setTimeout(() => {
          adapter.scrollToElement(parsed.elementId)
          adapter.highlightElement(parsed.elementId)
        }, 500)
      }
    },
    [setActiveDrawingId, adapter]
  )

  return { handleLinkOpen }
}
