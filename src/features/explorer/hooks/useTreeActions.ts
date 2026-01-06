import { useCallback, useState } from "react"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useTreeStore } from "@/shared/store/treeStore"

export function useTreeActions() {
  const { repository } = useServices()
  const { setTree } = useTreeStore()
  const { activeDrawingId, setActiveDrawingId } = useDrawingStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshTree = useCallback(async () => {
    const updatedTree = await repository.getDrawingsTree()
    setTree(updatedTree)
  }, [repository, setTree])

  const createDrawing = useCallback(
    async (parentId: string | null = null) => {
      setIsLoading(true)
      setError(null)
      try {
        const id = await repository.createDrawing("New Drawing", parentId)
        await repository.saveDrawing(id, {
          content: {
            elements: [],
            appState: {},
            files: {},
          },
        })
        await refreshTree()
        setActiveDrawingId(id)
        return id
      } catch (err) {
        setError("Failed to create drawing")
        console.error("[useTreeActions] Failed to create drawing:", err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [repository, refreshTree, setActiveDrawingId]
  )

  const updateTitle = useCallback(
    async (id: string, newTitle: string) => {
      try {
        await repository.updateDrawingTitle(id, newTitle)
        await refreshTree()
        return true
      } catch (err) {
        console.error("[useTreeActions] Failed to update title:", err)
        return false
      }
    },
    [repository, refreshTree]
  )

  const deleteDrawing = useCallback(
    async (id: string) => {
      try {
        await repository.deleteDrawing(id)
        await refreshTree()
        if (activeDrawingId === id) {
          setActiveDrawingId(null)
        }
        return true
      } catch (err) {
        console.error("[useTreeActions] Failed to delete drawing:", err)
        return false
      }
    },
    [repository, refreshTree, activeDrawingId, setActiveDrawingId]
  )

  const loadTree = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await refreshTree()
    } catch (err) {
      setError("Failed to load drawings")
      console.error("[useTreeActions] Failed to load tree:", err)
    } finally {
      setIsLoading(false)
    }
  }, [refreshTree])

  return {
    createDrawing,
    updateTitle,
    deleteDrawing,
    loadTree,
    isLoading,
    error,
    setError,
  }
}
