import { create } from "zustand"

interface TempStore {
  temporaryDrawings: Set<string>
  markAsTemporary: (drawingId: string) => void
  markAsPermanent: (drawingId: string) => void
  isTemporary: (drawingId: string) => boolean
  replaceTemporaryId: (tempId: string, realId: string) => void
}

export const useTempStore = create<TempStore>((set, get) => ({
  temporaryDrawings: new Set(),

  markAsTemporary: (drawingId) =>
    set((state) => {
      const newSet = new Set(state.temporaryDrawings)
      newSet.add(drawingId)
      return { temporaryDrawings: newSet }
    }),

  markAsPermanent: (drawingId) =>
    set((state) => {
      const newSet = new Set(state.temporaryDrawings)
      newSet.delete(drawingId)
      return { temporaryDrawings: newSet }
    }),

  isTemporary: (drawingId) => get().temporaryDrawings.has(drawingId),

  replaceTemporaryId: (tempId, _realId) =>
    set((state) => {
      const newSet = new Set(state.temporaryDrawings)
      newSet.delete(tempId)
      return { temporaryDrawings: newSet }
    }),
}))
