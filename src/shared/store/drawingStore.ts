import { create } from "zustand"

interface DrawingStore {
  titles: Record<string, string>
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
  titles: {},
  updateTitle: (drawingId, title) =>
    set((state) => ({
      titles: { ...state.titles, [drawingId]: title },
    })),
  getTitle: (drawingId) => get().titles[drawingId],

  activeDrawingId: null,
  setActiveDrawingId: (drawingId) => set({ activeDrawingId: drawingId }),

  isLoadingDrawing: false,
  setIsLoadingDrawing: (isLoading) => set({ isLoadingDrawing: isLoading }),

  newDrawingToFocus: null,
  setNewDrawingToFocus: (drawingId) => set({ newDrawingToFocus: drawingId }),
}))
