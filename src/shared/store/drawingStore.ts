import { create } from "zustand"

const LAST_DRAWING_KEY = "linkdraw:last-active-drawing"

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

  isImporting: boolean
  setIsImporting: (isImporting: boolean) => void
}

export const useDrawingStore = create<DrawingStore>((set, get) => ({
  titles: {},
  updateTitle: (drawingId, title) =>
    set((state) => ({
      titles: { ...state.titles, [drawingId]: title },
    })),
  getTitle: (drawingId) => get().titles[drawingId],

  activeDrawingId: null,
  setActiveDrawingId: (drawingId) => {
    set({ activeDrawingId: drawingId })
    // Save to localStorage for next session
    if (drawingId) {
      localStorage.setItem(LAST_DRAWING_KEY, drawingId)
    } else {
      localStorage.removeItem(LAST_DRAWING_KEY)
    }
  },

  isLoadingDrawing: false,
  setIsLoadingDrawing: (isLoading) => set({ isLoadingDrawing: isLoading }),

  newDrawingToFocus: null,
  setNewDrawingToFocus: (drawingId) => set({ newDrawingToFocus: drawingId }),

  isImporting: false,
  setIsImporting: (isImporting) => set({ isImporting }),
}))
