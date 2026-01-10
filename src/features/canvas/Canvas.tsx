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
  import(/* webpackChunkName: "excalidraw" */ "@excalidraw/excalidraw").then((mod) => ({
    default: mod.Excalidraw,
  }))
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
      console.log(`[Canvas] 💾 SAVING drawing ${activeDrawingId.slice(0, 8)}`)
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

  // Center content only on first load (when appState is empty in storage)
  useEffect(() => {
    if (!excalidrawAPI || !activeDrawingId) return

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Centering logic requires multiple calculations
    const centerIfNeeded = async () => {
      try {
        // Load drawing from storage
        const drawing = await repository.loadDrawing(activeDrawingId)
        const storedAppState = drawing?.content?.appState

        // Only center if appState is empty (fresh from examples)
        const shouldCenter = !storedAppState || Object.keys(storedAppState).length === 0

        console.log(
          `[Canvas] 🔍 Drawing ${activeDrawingId.slice(0, 8)} - stored appState keys: ${Object.keys(storedAppState || {}).length}, shouldCenter: ${shouldCenter}`
        )

        if (shouldCenter) {
          const elements = excalidrawAPI.getSceneElements()
          if (elements.length > 0) {
            // Get viewport dimensions
            const currentAppState = excalidrawAPI.getAppState()
            const viewportWidth = currentAppState.width
            const viewportHeight = currentAppState.height

            // Calculate content bounds
            let minX = Number.POSITIVE_INFINITY
            let maxX = Number.NEGATIVE_INFINITY
            let minY = Number.POSITIVE_INFINITY
            let maxY = Number.NEGATIVE_INFINITY

            for (const el of elements) {
              minX = Math.min(minX, el.x)
              maxX = Math.max(maxX, el.x + el.width)
              minY = Math.min(minY, el.y)
              maxY = Math.max(maxY, el.y + el.height)
            }

            const contentWidth = maxX - minX

            // Calculate zoom to fit 70% of viewport width (accounting for sidebar)
            const SIDEBAR_WIDTH = 280
            const availableWidth = viewportWidth - SIDEBAR_WIDTH
            const targetWidth = availableWidth * 0.7
            const zoom = Math.min(targetWidth / contentWidth, 2) // Max zoom 2x

            // Calculate scroll positions
            // Horizontal: center the content in the available space (viewport - sidebar)
            const contentCenterX = minX + contentWidth / 2
            const availableCenterX = SIDEBAR_WIDTH + availableWidth / 2
            const scrollX = availableCenterX - contentCenterX * zoom

            // Vertical: 5% margin from top
            const scrollY = viewportHeight * 0.05 - minY * zoom

            // Apply centering
            console.log(`[Canvas] 🎯 Centering drawing ${activeDrawingId.slice(0, 8)}`)
            excalidrawAPI.updateScene({
              appState: {
                scrollX,
                scrollY,
                // biome-ignore lint/suspicious/noExplicitAny: Excalidraw zoom type mismatch
                zoom: { value: zoom as any },
              },
            })
          }
        }
      } catch (error) {
        console.error("[Canvas] Failed to check scroll position:", error)
      }
    }

    // Execute immediately
    centerIfNeeded()
  }, [excalidrawAPI, activeDrawingId, repository])

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

    let changeTimeout: number | null = null

    const handleChange = async () => {
      // Debounce onChange to avoid multiple rapid calls
      if (changeTimeout) clearTimeout(changeTimeout)

      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: onChange handler requires auto-create and save logic
      changeTimeout = setTimeout(async () => {
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
      }, 100) // 100ms debounce
    }

    const unsubscribe = adapter.onChange(handleChange)
    return () => {
      console.log("[Canvas] Cleaning up onChange subscription")
      if (changeTimeout) clearTimeout(changeTimeout)
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

  const isMobile = window.innerWidth < 768

  return (
    <div className="w-full h-screen relative overflow-hidden">
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center h-full"
            style={{
              backgroundColor: "var(--color-surface-primary, #ffffff)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "3px solid rgba(0, 0, 0, 0.1)",
                  borderTopColor: "rgba(0, 0, 0, 0.6)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <div style={{ fontSize: "14px", color: "rgba(0, 0, 0, 0.6)" }}>Loading canvas...</div>
            </div>
          </div>
        }
      >
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={{
            appState: {
              viewBackgroundColor: "#ffffff",
              ...(isMobile && { viewModeEnabled: false }),
            },
          }}
          theme={theme}
          onChange={() => adapter.notifyChange()}
          onLinkOpen={handleLinkOpen}
          UIOptions={{
            canvasActions: {
              toggleTheme: false,
            },
          }}
          renderTopRightUI={
            isMobile
              ? undefined
              : () => <LinkButton onClick={handleOpenLinkModal} disabled={!hasSelection} />
          }
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
