import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { useCallback, useEffect, useRef } from "react"
import type { ExcalidrawAdapter } from "@/shared/adapters/excalidraw/ExcalidrawAdapter"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import { useDrawingStore } from "@/shared/store/drawingStore"
import type { ExcalidrawContent } from "@/shared/types/drawing"

export function useCanvasLoader(
  repository: IGraphRepository,
  excalidrawAPI: ExcalidrawImperativeAPI | null,
  adapter: ExcalidrawAdapter
) {
  const activeDrawingId = useDrawingStore((state) => state.activeDrawingId)
  const setIsLoadingDrawing = useDrawingStore((state) => state.setIsLoadingDrawing)
  const previousDrawingIdRef = useRef<string | null>(null)
  const contentCacheRef = useRef<Map<string, ExcalidrawContent>>(new Map())
  const navigationVersionRef = useRef(0)

  const persistOutgoingDrawing = useCallback(
    async (nextDrawingId: string) => {
      const outgoingDrawingId = previousDrawingIdRef.current
      if (!outgoingDrawingId || outgoingDrawingId === nextDrawingId) return

      const currentContent = adapter.getContent()
      contentCacheRef.current.set(outgoingDrawingId, currentContent)
      console.log("[Canvas] Cached content for:", outgoingDrawingId)

      try {
        await repository.saveDrawing(outgoingDrawingId, { content: currentContent })
        if (contentCacheRef.current.get(outgoingDrawingId) === currentContent) {
          contentCacheRef.current.delete(outgoingDrawingId)
        }
      } catch (error) {
        // Keep the correctly keyed snapshot for the next autosave/unmount retry.
        console.error("[Canvas] Failed to save outgoing drawing:", outgoingDrawingId, error)
      }
    },
    [adapter, repository]
  )

  const loadCurrentDrawing = useCallback(
    async (drawingId: string) => {
      const navigationVersion = ++navigationVersionRef.current
      console.log("[Canvas] Loading drawing:", drawingId)
      setIsLoadingDrawing(true)
      try {
        // Snapshot the outgoing canvas under its own ID before loading anything else.
        await persistOutgoingDrawing(drawingId)

        const drawing = await repository.loadDrawing(drawingId)
        if (navigationVersion !== navigationVersionRef.current) return
        if (!drawing) {
          throw new Error(`Drawing not found: ${drawingId}`)
        }

        adapter.setContent(drawing.content)
        adapter.markAsSaved()
        console.log("[Canvas] Drawing loaded:", drawingId)
        previousDrawingIdRef.current = drawingId
      } catch (err) {
        if (navigationVersion !== navigationVersionRef.current) return
        console.error("[Canvas] Failed to load drawing:", drawingId, err)
        throw err
      } finally {
        if (navigationVersion === navigationVersionRef.current) {
          setIsLoadingDrawing(false)
        }
      }
    },
    [repository, setIsLoadingDrawing, adapter, persistOutgoingDrawing]
  )

  const saveAllCachedDrawings = useCallback(async () => {
    console.log("[Canvas] Saving", contentCacheRef.current.size, "cached drawings")
    const entries = Array.from(contentCacheRef.current.entries())

    await Promise.all(
      entries.map(async ([drawingId, content]) => {
        try {
          await repository.saveDrawing(drawingId, { content })
          if (contentCacheRef.current.get(drawingId) === content) {
            contentCacheRef.current.delete(drawingId)
          }
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
      navigationVersionRef.current++
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
      navigationVersionRef.current++
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
