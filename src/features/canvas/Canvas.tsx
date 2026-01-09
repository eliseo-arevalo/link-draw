import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import { Toast } from "@/shared/components/Toast"
import { useAutoSave } from "@/shared/hooks/useAutoSave"
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts"
import { createDrawingLink, createElementLink } from "@/shared/lib/drawing-links"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useThemeStore } from "@/shared/store/themeStore"
import { DrawingPickerModal } from "./components/DrawingPickerModal"
import { LinkButton } from "./components/LinkButton"
import { useCanvasLoader } from "./hooks/useCanvasLoader"
import { useElementSelection } from "./hooks/useElementSelection"
import { useLinkNavigation } from "./hooks/useLinkNavigation"

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((mod) => ({ default: mod.Excalidraw }))
)

export function Canvas() {
  const { adapter, drawingService, repository } = useServices()
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null)
  const { activeDrawingId, setActiveDrawingId } = useDrawingStore()
  const { theme } = useThemeStore()
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [canvasError, setCanvasError] = useState<string | null>(null)

  const { selectedElementIds, hasSelection } = useElementSelection(excalidrawAPI, adapter)
  const { handleLinkOpen, errorMessage, clearError } = useLinkNavigation(adapter)
  const { saveAllCachedDrawings } = useCanvasLoader(
    drawingService,
    repository,
    excalidrawAPI,
    adapter
  )

  const saveAllRef = useRef(saveAllCachedDrawings)
  saveAllRef.current = saveAllCachedDrawings

  const { triggerSave, forceSave } = useAutoSave(
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

  // Center content when drawing changes
  useEffect(() => {
    if (!excalidrawAPI || !activeDrawingId) return

    // Small delay to ensure content is loaded
    const timer = setTimeout(() => {
      try {
        const elements = excalidrawAPI.getSceneElements()
        // Only center if there are elements (avoid excessive zoom on empty canvas)
        if (elements.length > 0) {
          excalidrawAPI.scrollToContent(elements, {
            fitToViewport: true,
            animate: false,
          })
        }
      } catch (error) {
        console.error("[Canvas] Failed to center content:", error)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [excalidrawAPI, activeDrawingId])

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "s",
      meta: true,
      handler: () => forceSave(),
      description: "Save drawing",
    },
    {
      key: "l",
      meta: true,
      handler: () => hasSelection && setIsLinkModalOpen(true),
      description: "Add link to selection",
    },
  ])

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
    [selectedElementIds, adapter.setElementLink]
  )

  const handleUrlSelect = useCallback(
    (url: string) => {
      for (const elementId of selectedElementIds) {
        adapter.setElementLink(elementId, url)
      }

      setIsLinkModalOpen(false)
      triggerSaveRef.current()
      console.log(`[Canvas] Linked ${selectedElementIds.length} element(s) to URL`)
    },
    [selectedElementIds, adapter.setElementLink]
  )

  useEffect(() => {
    if (!excalidrawAPI) return

    console.log("[Canvas] Initializing Excalidraw adapter")
    adapter.setAPI(excalidrawAPI)

    const handleChange = async () => {
      console.log("[Canvas] Content changed")

      // Auto-crear dibujo si no hay uno activo y hay contenido
      if (!activeDrawingId) {
        const content = adapter.getContent()
        const hasContent = content.elements && content.elements.length > 0

        if (hasContent) {
          console.log("[Canvas] Auto-creating 'Untitled' drawing")
          try {
            const newId = await drawingService.createDrawing({
              title: "Untitled",
              parent_id: null,
              content,
            })
            setActiveDrawingId(newId)
            return // No trigger save, ya guardamos al crear
          } catch (error) {
            console.error("[Canvas] Failed to auto-create drawing:", error)
            setCanvasError("Failed to create drawing")
          }
        }
      }

      triggerSaveRef.current()
    }

    const unsubscribe = adapter.onChange(handleChange)
    return () => {
      console.log("[Canvas] Cleaning up onChange subscription")
      unsubscribe()
    }
  }, [
    excalidrawAPI,
    activeDrawingId,
    setActiveDrawingId,
    adapter.getContent,
    adapter.onChange,
    adapter.setAPI,
    drawingService.createDrawing,
  ])

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
          theme={theme}
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
        onSelectUrl={handleUrlSelect}
        currentDrawingId={activeDrawingId}
      />

      {errorMessage && <Toast message={errorMessage} type="error" onClose={clearError} />}
      {canvasError && (
        <Toast message={canvasError} type="error" onClose={() => setCanvasError(null)} />
      )}
    </div>
  )
}
