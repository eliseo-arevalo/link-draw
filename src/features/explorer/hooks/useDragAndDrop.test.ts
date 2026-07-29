import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useDragAndDrop } from "./useDragAndDrop"

function dragEvent() {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    dataTransfer: { effectAllowed: "none", dropEffect: "none" },
  } as unknown as React.DragEvent
}

describe("useDragAndDrop", () => {
  it("tracks the dragged and hovered nodes and resets them", () => {
    const { result } = renderHook(() => useDragAndDrop())
    const start = dragEvent()
    act(() => result.current.handleDragStart(start, "source"))
    expect(result.current.draggedId).toBe("source")
    expect(start.dataTransfer.effectAllowed).toBe("all")

    const over = dragEvent()
    act(() => result.current.handleDragOver(over, "target"))
    expect(over.preventDefault).toHaveBeenCalled()
    expect(over.stopPropagation).toHaveBeenCalled()
    expect(over.dataTransfer.dropEffect).toBe("move")
    expect(result.current.dragOverId).toBe("target")

    act(() => result.current.handleDragEnd())
    expect(result.current.draggedId).toBeNull()
    expect(result.current.dragOverId).toBeNull()
  })

  it("does not mark the dragged node as its own drop target", () => {
    const { result } = renderHook(() => useDragAndDrop())
    act(() => result.current.handleDragStart(dragEvent(), "same"))
    act(() => result.current.handleDragOver(dragEvent(), "same"))
    expect(result.current.dragOverId).toBeNull()
  })
})
