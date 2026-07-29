import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useCanvasLoader } from "./useCanvasLoader"

describe("useCanvasLoader", () => {
  const content = { elements: [{ id: "cached" }], appState: {}, files: {} }
  const drawingService = { loadDrawing: vi.fn() }
  const repository = { saveDrawing: vi.fn() }
  const adapter = { getContent: vi.fn(() => content), setContent: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    useDrawingStore.setState({ activeDrawingId: null, isLoadingDrawing: false })
  })

  it("waits for the API and clears the canvas when no drawing is active", () => {
    const { rerender } = renderHook(
      ({ api }) =>
        useCanvasLoader(drawingService as never, repository as never, api, adapter as never),
      { initialProps: { api: null as never } }
    )
    expect(adapter.setContent).not.toHaveBeenCalled()
    rerender({ api: {} as never })
    expect(adapter.setContent).toHaveBeenCalledWith({ elements: [], appState: {}, files: {} })
  })

  it("loads active drawings, caches the previous content and persists the cache", async () => {
    drawingService.loadDrawing.mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useCanvasLoader(drawingService as never, repository as never, {} as never, adapter as never)
    )

    act(() => useDrawingStore.getState().setActiveDrawingId("first"))
    await waitFor(() => expect(drawingService.loadDrawing).toHaveBeenCalledWith("first"))
    expect(result.current.previousDrawingIdRef.current).toBe("first")
    expect(useDrawingStore.getState().isLoadingDrawing).toBe(false)

    act(() => useDrawingStore.getState().setActiveDrawingId("second"))
    await waitFor(() => expect(drawingService.loadDrawing).toHaveBeenCalledWith("second"))
    await act(() => result.current.saveAllCachedDrawings())
    expect(repository.saveDrawing).toHaveBeenCalledWith("first", { content })
  })

  it("can discard cached content before saving", async () => {
    drawingService.loadDrawing.mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useCanvasLoader(drawingService as never, repository as never, {} as never, adapter as never)
    )
    act(() => useDrawingStore.getState().setActiveDrawingId("first"))
    await waitFor(() => expect(drawingService.loadDrawing).toHaveBeenCalledWith("first"))
    act(() => useDrawingStore.getState().setActiveDrawingId("second"))
    await waitFor(() => expect(drawingService.loadDrawing).toHaveBeenCalledWith("second"))
    act(() => result.current.clearCache())
    await act(() => result.current.saveAllCachedDrawings())
    expect(repository.saveDrawing).not.toHaveBeenCalled()
  })
})
