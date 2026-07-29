import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useCanvasLoader } from "./useCanvasLoader"

describe("useCanvasLoader", () => {
  const content = { elements: [{ id: "cached" }], appState: {}, files: {} }
  const repository = { saveDrawing: vi.fn(), loadDrawing: vi.fn() }
  const adapter = {
    getContent: vi.fn(() => content),
    setContent: vi.fn(),
    markAsSaved: vi.fn(),
  }
  const storedDrawing = (id: string) => ({
    id,
    title: id,
    content: { elements: [{ id }], appState: {}, files: {} },
  })

  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    repository.saveDrawing.mockResolvedValue(undefined)
    repository.loadDrawing.mockImplementation(async (id: string) => storedDrawing(id))
    adapter.getContent.mockReturnValue(content)
    useDrawingStore.setState({ activeDrawingId: null, isLoadingDrawing: false })
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("waits for the API and clears the canvas when no drawing is active", () => {
    const { rerender } = renderHook(
      ({ api }) => useCanvasLoader(repository as never, api, adapter as never),
      { initialProps: { api: null as never } }
    )
    expect(adapter.setContent).not.toHaveBeenCalled()
    rerender({ api: {} as never })
    expect(adapter.setContent).toHaveBeenCalledWith({ elements: [], appState: {}, files: {} })
  })

  it("saves the outgoing snapshot under its own ID before loading the next drawing", async () => {
    const { result } = renderHook(() =>
      useCanvasLoader(repository as never, {} as never, adapter as never)
    )

    act(() => useDrawingStore.getState().setActiveDrawingId("first"))
    await waitFor(() => expect(adapter.setContent).toHaveBeenCalledWith(storedDrawing("first").content))
    expect(result.current.previousDrawingIdRef.current).toBe("first")
    expect(useDrawingStore.getState().isLoadingDrawing).toBe(false)

    act(() => useDrawingStore.getState().setActiveDrawingId("second"))
    await waitFor(() => expect(adapter.setContent).toHaveBeenCalledWith(storedDrawing("second").content))
    expect(repository.saveDrawing).toHaveBeenCalledWith("first", { content })
    expect(repository.saveDrawing).not.toHaveBeenCalledWith("second", { content })
    expect(adapter.markAsSaved).toHaveBeenCalledTimes(2)
  })

  it("keeps a failed outgoing snapshot for retry and can explicitly discard it", async () => {
    repository.saveDrawing.mockRejectedValueOnce(new Error("storage unavailable"))
    const { result } = renderHook(() =>
      useCanvasLoader(repository as never, {} as never, adapter as never)
    )
    act(() => useDrawingStore.getState().setActiveDrawingId("first"))
    await waitFor(() => expect(adapter.setContent).toHaveBeenCalledWith(storedDrawing("first").content))
    act(() => useDrawingStore.getState().setActiveDrawingId("second"))
    await waitFor(() => expect(adapter.setContent).toHaveBeenCalledWith(storedDrawing("second").content))
    expect(repository.saveDrawing).toHaveBeenCalledTimes(1)
    act(() => result.current.clearCache())
    await act(() => result.current.saveAllCachedDrawings())
    expect(repository.saveDrawing).toHaveBeenCalledTimes(1)
  })

  it("never applies a stale load that resolves after a newer navigation", async () => {
    let resolveFirst: (value: ReturnType<typeof storedDrawing>) => void = () => undefined
    let resolveSecond: (value: ReturnType<typeof storedDrawing>) => void = () => undefined
    repository.loadDrawing.mockImplementation(
      (id: string) =>
        new Promise((resolve) => {
          if (id === "first") resolveFirst = resolve
          if (id === "second") resolveSecond = resolve
        })
    )
    const { result } = renderHook(() =>
      useCanvasLoader(repository as never, {} as never, adapter as never)
    )
    adapter.setContent.mockClear()

    act(() => useDrawingStore.getState().setActiveDrawingId("first"))
    await waitFor(() => expect(repository.loadDrawing).toHaveBeenCalledWith("first"))
    act(() => useDrawingStore.getState().setActiveDrawingId("second"))
    await waitFor(() => expect(repository.loadDrawing).toHaveBeenCalledWith("second"))

    await act(async () => resolveSecond(storedDrawing("second")))
    await waitFor(() => expect(adapter.setContent).toHaveBeenCalledWith(storedDrawing("second").content))
    await act(async () => resolveFirst(storedDrawing("first")))

    expect(adapter.setContent).not.toHaveBeenCalledWith(storedDrawing("first").content)
    expect(result.current.previousDrawingIdRef.current).toBe("second")
  })
})
