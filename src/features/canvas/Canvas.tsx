import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import { ExcalidrawAdapter } from "@/shared/adapters/excalidraw/ExcalidrawAdapter"
import { useAutoSave } from "@/shared/hooks/useAutoSave"
import { LocalStorageRepository } from "@/shared/repositories/localStorage/LocalStorageRepository"
import { DrawingService } from "@/shared/services/DrawingService"
import { useDrawingStore } from "@/shared/store/drawingStore"

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((mod) => ({ default: mod.Excalidraw }))
)
const repository = new LocalStorageRepository()
const adapter = new ExcalidrawAdapter()
const drawingService = new DrawingService(repository, adapter)

export function Canvas() {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null)
  const { activeDrawingId, setIsLoadingDrawing } = useDrawingStore()
  const [error, setError] = useState<string | null>(null)

  const { triggerSave } = useAutoSave(
    async () => {
      if (!activeDrawingId) return
      await drawingService.saveCurrentDrawing(activeDrawingId)
    },
    {
      delay: 2000,
      enabled: !!activeDrawingId,
      onSaveSuccess: () => console.log("Auto-saved"),
      onSaveError: (error) => console.error("Auto-save failed:", error),
    }
  )

  useEffect(() => {
    if (!excalidrawAPI) return

    console.log("[Canvas] Initializing Excalidraw adapter")
    adapter.setAPI(excalidrawAPI)

    // Use a ref to always get the latest activeDrawingId
    const handleChange = () => {
      console.log("[Canvas] Content changed, triggering save for:", activeDrawingId)
      triggerSave()
    }

    const unsubscribe = adapter.onChange(handleChange)

    return () => {
      console.log("[Canvas] Cleaning up onChange subscription")
      unsubscribe()
    }
  }, [excalidrawAPI, activeDrawingId, triggerSave])

  // Ref para trackear el drawing previo
  const previousDrawingIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!activeDrawingId || !excalidrawAPI) return

    let cancelled = false

    const loadDrawing = async () => {
      // Guardar el drawing anterior antes de cargar el nuevo
      if (previousDrawingIdRef.current && previousDrawingIdRef.current !== activeDrawingId) {
        console.log(
          "[Canvas] Saving previous drawing before loading new one:",
          previousDrawingIdRef.current
        )
        try {
          await drawingService.saveCurrentDrawing(previousDrawingIdRef.current)
          console.log("[Canvas] Previous drawing saved successfully")
        } catch (err) {
          console.error("[Canvas] Failed to save previous drawing:", err)
        }
      }

      console.log("[Canvas] Loading drawing:", activeDrawingId)
      setIsLoadingDrawing(true)
      setError(null)
      try {
        await drawingService.loadDrawing(activeDrawingId)
        if (!cancelled) {
          console.log("[Canvas] Drawing loaded successfully:", activeDrawingId)
          previousDrawingIdRef.current = activeDrawingId
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load drawing")
          console.error("[Canvas] Failed to load drawing:", activeDrawingId, err)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDrawing(false)
        }
      }
    }

    loadDrawing()

    return () => {
      console.log("[Canvas] Cleanup for:", activeDrawingId)
      cancelled = true
    }
  }, [activeDrawingId, excalidrawAPI, setIsLoadingDrawing])

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative", overflow: "hidden" }}>
      {error && (
        <div
          style={{
            position: "absolute",
            top: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            backgroundColor: "rgba(239, 68, 68, 0.95)",
            color: "white",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.875rem" }}>{error}</p>
        </div>
      )}
      <Suspense
        fallback={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <div style={{ fontSize: "1.125rem" }}>Loading editor...</div>
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
        />
      </Suspense>
    </div>
  )
}
