import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDrawingStore } from "@/shared/store/drawingStore"

const repository = { loadDrawing: vi.fn() }
vi.mock("@/shared/providers/ServiceProvider", () => ({
  useServices: () => ({ repository }),
}))

import { useLinkNavigation } from "./useLinkNavigation"

describe("useLinkNavigation", () => {
  beforeEach(() => {
    repository.loadDrawing.mockReset()
    useDrawingStore.setState({ activeDrawingId: null })
  })
  afterEach(() => vi.useRealTimers())

  it("ignores ordinary links", async () => {
    const { result } = renderHook(() => useLinkNavigation({} as never))
    const event = { preventDefault: vi.fn() }
    await act(() => result.current.handleLinkOpen({ link: "https://example.com" }, event as never))
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(repository.loadDrawing).not.toHaveBeenCalled()
  })

  it("navigates to an existing drawing and focuses a linked element", async () => {
    vi.useFakeTimers()
    repository.loadDrawing.mockResolvedValue({ id: "target" })
    const adapter = { scrollToElement: vi.fn(), highlightElement: vi.fn() }
    const { result } = renderHook(() => useLinkNavigation(adapter as never))
    const event = { preventDefault: vi.fn() }

    await act(() =>
      result.current.handleLinkOpen({ link: "drawing://target#element:element-1" }, event as never)
    )
    expect(event.preventDefault).toHaveBeenCalled()
    expect(useDrawingStore.getState().activeDrawingId).toBe("target")
    act(() => vi.advanceTimersByTime(500))
    expect(adapter.scrollToElement).toHaveBeenCalledWith("element-1")
    expect(adapter.highlightElement).toHaveBeenCalledWith("element-1")
  })

  it("reports and clears a missing drawing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    repository.loadDrawing.mockResolvedValue(null)
    const { result } = renderHook(() => useLinkNavigation({} as never))

    await act(() =>
      result.current.handleLinkOpen({ link: "drawing://missing" }, {
        preventDefault: vi.fn(),
      } as never)
    )
    await waitFor(() => expect(result.current.errorMessage).toBe("This drawing no longer exists"))
    act(() => result.current.clearError())
    expect(result.current.errorMessage).toBeNull()
  })
})
