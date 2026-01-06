import { create } from "zustand"

type ViewMode = "canvas" | "graph"

interface ViewStore {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  toggleView: () => void
}

export const useViewStore = create<ViewStore>((set) => ({
  viewMode: "canvas",
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleView: () =>
    set((state) => ({ viewMode: state.viewMode === "canvas" ? "graph" : "canvas" })),
}))
