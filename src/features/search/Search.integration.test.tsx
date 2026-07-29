import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useViewStore } from "@/shared/store/viewStore"

const repository = { listDrawings: vi.fn() }
vi.mock("@/shared/providers/ServiceProvider", () => ({
  useServices: () => ({ repository }),
}))

import { Search } from "./Search"

describe("Search integration", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })
  beforeEach(() => {
    repository.listDrawings.mockReset()
    useDrawingStore.setState({ activeDrawingId: null })
    useViewStore.setState({ viewMode: "canvas" })
  })

  it("opens from the keyboard, searches repository content and navigates to a result", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    repository.listDrawings.mockResolvedValue([
      {
        id: "architecture",
        title: "System architecture",
        content: { elements: [{ id: "text", text: "Deployment notes" }] },
      },
    ])
    render(<Search />)

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "f", ctrlKey: true, shiftKey: true })
      )
    })
    const input = screen.getByRole("textbox", { name: "Search in all drawings" })
    fireEvent.change(input, { target: { value: "deployment" } })

    await waitFor(() => expect(screen.getByText("Deployment notes")).toBeTruthy())
    expect(screen.getByRole("img", { name: "file" })).toBeTruthy()
    expect(warn).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText("Deployment notes"))
    expect(useDrawingStore.getState().activeDrawingId).toBe("architecture")
    expect(useViewStore.getState().viewMode).toBe("canvas")
    expect(screen.queryByRole("textbox", { name: "Search in all drawings" })).toBeNull()
  })

  it("closes and clears the search with Escape", () => {
    render(<Search />)
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "f", metaKey: true, shiftKey: true })
      )
    })
    expect(screen.getByRole("textbox", { name: "Search in all drawings" })).toBeTruthy()
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })))
    expect(screen.queryByRole("textbox", { name: "Search in all drawings" })).toBeNull()
  })
})
