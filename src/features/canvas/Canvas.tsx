import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import { ExcalidrawAdapter } from "@/shared/adapters/excalidraw/ExcalidrawAdapter"
import { useAutoSave } from "@/shared/hooks/useAutoSave"
import { createDrawingLink, createElementLink } from "@/shared/lib/drawing-links"
import { LocalStorageRepository } from "@/shared/repositories/localStorage/LocalStorageRepository"
import { DrawingService } from "@/shared/services/DrawingService"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { DrawingPickerModal } from "./components/DrawingPickerModal"
import { LinkButton } from "./components/LinkButton"
import { useCanvasLoader } from "./hooks/useCanvasLoader"
import { useElementSelection } from "./hooks/useElementSelection"
import { useLinkNavigation } from "./hooks/useLinkNavigation"

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((mod) => ({ default: mod.Excalidraw }))
)

const repository = new LocalStorageRepository()
const adapter = new ExcalidrawAdapter()
const drawingService = new DrawingService(repository, adapter)

export function Canvas() {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null)
  const { activeDrawingId } = useDrawingStore()
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)

  const { selectedElementIds, hasSelection } = useElementSelection(excalidrawAPI, adapter)
  const { handleLinkOpen } = useLinkNavigation(adapter)
  const { saveAllCachedDrawings } = useCanvasLoader(drawingService, repository, excalidrawAPI, adapter)
  
  const saveAllRef = useRef(saveAllCachedDrawings)
  saveAllRef.current = saveAllCachedDrawings

  const { triggerSave } = useAutoSave(
    async () => {
      if (!activeDrawingId) return
      // Guardar cache primero
      await saveAllRef.current()
      // Luego guardar el actual
      await drawingService.saveCurrentDrawing(activeDrawingId)
    },
    {
      delay: 500,
      enabled: !!activeDrawingId,
      onSaveSuccess: () => console.log("Auto-saved"),
      onSaveError: (error) => console.error("Auto-save failed:", error),
    }
  )

  const triggerSaveRef = useRef(triggerSave)
  triggerSaveRef.current = triggerSave

  const handleOpenLinkModal = useCallback(() => {
    if (hasSelection) setIsLinkModalOpen(true)
  }, [hasSelection])

  const handleLinkSelect = useCallback(
    (targetDrawingId: string, _targetTitle: string, targetElementId?: string) => {
      const link = targetElementId
        ? createElementLink(targetDrawingId, targetElementId)
        : createDrawingLink(targetDrawingId)

      for (const elementId of selectedElementIds) {
        adapter.setElementLink(elementId, link)
      }

      setIsLinkModalOpen(false)
      triggerSaveRef.current()
      console.log(`[Canvas] Linked ${selectedElementIds.length} element(s)`)
    },
    [selectedElementIds]
  )

  useEffect(() => {
    if (!excalidrawAPI) return

    console.log("[Canvas] Initializing Excalidraw adapter")
    adapter.setAPI(excalidrawAPI)

    const handleChange = () => {
      console.log("[Canvas] Content changed")
      triggerSaveRef.current()
    }

    const unsubscribe = adapter.onChange(handleChange)
    return () => {
      console.log("[Canvas] Cleaning up onChange subscription")
      unsubscribe()
    }
  }, [excalidrawAPI])

  useEffect(() => {
    if (!hasSelection || isLinkModalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault()
        setIsLinkModalOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [hasSelection, isLinkModalOpen])

  return (
    <div className="w-full h-screen relative overflow-hidden">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-lg">Loading editor...</div>
          </div>
        }
      >
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={{
            appState: {
              viewBackgroundColor: "#ffffff",
            },
          }}
          onChange={() => adapter.notifyChange()}
          onLinkOpen={handleLinkOpen}
          renderTopRightUI={() => (
            <LinkButton onClick={handleOpenLinkModal} disabled={!hasSelection} />
          )}
        />
      </Suspense>

      <DrawingPickerModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSelect={handleLinkSelect}
        currentDrawingId={activeDrawingId}
      />
    </div>
  )
}
