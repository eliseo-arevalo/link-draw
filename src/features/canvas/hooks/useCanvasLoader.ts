import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { useCallback, useEffect, useRef } from "react"
import type { ExcalidrawAdapter } from "@/shared/adapters/excalidraw/ExcalidrawAdapter"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import type { DrawingService } from "@/shared/services/DrawingService"
import { useDrawingStore } from "@/shared/store/drawingStore"
import type { ExcalidrawContent } from "@/shared/types/drawing"

export function useCanvasLoader(
  drawingService: DrawingService,
  repository: IGraphRepository,
  excalidrawAPI: ExcalidrawImperativeAPI | null,
  adapter: ExcalidrawAdapter
) {
  const { activeDrawingId, setIsLoadingDrawing } = useDrawingStore()
  const previousDrawingIdRef = useRef<string | null>(null)
  const contentCacheRef = useRef<Map<string, ExcalidrawContent>>(new Map())

  const loadCurrentDrawing = useCallback(
    async (drawingId: string) => {
      console.log("[Canvas] Loading drawing:", drawingId)
      setIsLoadingDrawing(true)
      try {
        // Guardar contenido actual en cache ANTES de cargar
        if (previousDrawingIdRef.current) {
          const currentContent = adapter.getContent()
          contentCacheRef.current.set(previousDrawingIdRef.current, currentContent)
          console.log("[Canvas] Cached content for:", previousDrawingIdRef.current)
        }

        // Cargar el nuevo drawing
        await drawingService.loadDrawing(drawingId)
        console.log("[Canvas] Drawing loaded:", drawingId)
        previousDrawingIdRef.current = drawingId
      } catch (err) {
        console.error("[Canvas] Failed to load drawing:", drawingId, err)
        throw err
      } finally {
        setIsLoadingDrawing(false)
      }
    },
    [drawingService, setIsLoadingDrawing, adapter]
  )

  const saveAllCachedDrawings = useCallback(async () => {
    console.log("[Canvas] Saving", contentCacheRef.current.size, "cached drawings")
    const entries = Array.from(contentCacheRef.current.entries())
    contentCacheRef.current.clear()

    await Promise.all(
      entries.map(async ([drawingId, content]) => {
        try {
          await repository.saveDrawing(drawingId, { content })
          console.log("[Canvas] Saved cached drawing:", drawingId)
        } catch (err) {
          console.error("[Canvas] Failed to save cached drawing:", drawingId, err)
        }
      })
    )
  }, [repository])

  useEffect(() => {
    if (!excalidrawAPI) return

    // Si no hay drawing activo, limpiar el canvas
    if (!activeDrawingId) {
      console.log("[Canvas] No active drawing, clearing canvas")
      adapter.setContent({ elements: [], appState: {}, files: {} })
      previousDrawingIdRef.current = null
      return
    }

    let cancelled = false

    const loadDrawing = async () => {
      if (!cancelled) {
        await loadCurrentDrawing(activeDrawingId)
      }
    }

    loadDrawing()

    return () => {
      console.log("[Canvas] Cleanup for:", activeDrawingId)
      cancelled = true
    }
  }, [activeDrawingId, excalidrawAPI, loadCurrentDrawing, adapter])

  const clearCache = useCallback(() => {
    console.log("[Canvas] Clearing content cache")
    contentCacheRef.current.clear()
  }, [])

  // Guardar todo al desmontar
  useEffect(() => {
    return () => {
      saveAllCachedDrawings()
    }
  }, [saveAllCachedDrawings])

  return { previousDrawingIdRef, saveAllCachedDrawings, clearCache }
}
