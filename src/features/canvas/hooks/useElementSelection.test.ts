import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useElementSelection } from "./useElementSelection"

describe("useElementSelection", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("polls selected element IDs and stops polling after unmount", () => {
    const adapter = { getSelectedElementIds: vi.fn().mockReturnValue(["one"]) }
    const { result, unmount } = renderHook(() => useElementSelection({} as never, adapter as never))

    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toEqual({ selectedElementIds: ["one"], hasSelection: true })

    adapter.getSelectedElementIds.mockReturnValue([])
    act(() => vi.advanceTimersByTime(100))
    expect(result.current.hasSelection).toBe(false)
    unmount()
    const calls = adapter.getSelectedElementIds.mock.calls.length
    vi.advanceTimersByTime(200)
    expect(adapter.getSelectedElementIds).toHaveBeenCalledTimes(calls)
  })

  it("does nothing until the Excalidraw API exists", () => {
    const adapter = { getSelectedElementIds: vi.fn() }
    renderHook(() => useElementSelection(null, adapter as never))
    act(() => vi.advanceTimersByTime(500))
    expect(adapter.getSelectedElementIds).not.toHaveBeenCalled()
  })
})
