import { create } from "zustand"

interface DrawingStore {
  titles: Map<string, string>
  updateTitle: (drawingId: string, title: string) => void
  getTitle: (drawingId: string) => string | undefined

  activeDrawingId: string | null
  setActiveDrawingId: (drawingId: string | null) => void
  isLoadingDrawing: boolean
  setIsLoadingDrawing: (isLoading: boolean) => void

  newDrawingToFocus: string | null
  setNewDrawingToFocus: (drawingId: string | null) => void
}

export const useDrawingStore = create<DrawingStore>((set, get) => ({
  titles: new Map(),
  updateTitle: (drawingId, title) =>
    set((state) => {
      const newTitles = new Map(state.titles)
      newTitles.set(drawingId, title)
      return { titles: newTitles }
    }),
  getTitle: (drawingId) => get().titles.get(drawingId),

  activeDrawingId: null,
  setActiveDrawingId: (drawingId) => set({ activeDrawingId: drawingId }),

  isLoadingDrawing: false,
  setIsLoadingDrawing: (isLoading) => set({ isLoadingDrawing: isLoading }),

  newDrawingToFocus: null,
  setNewDrawingToFocus: (drawingId) => set({ newDrawingToFocus: drawingId }),
}))
