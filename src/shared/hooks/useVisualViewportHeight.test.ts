import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useVisualViewportHeight } from "./useVisualViewportHeight"

let originalInnerHeight: PropertyDescriptor | undefined

describe("useVisualViewportHeight", () => {
  beforeEach(() => {
    originalInnerHeight = Object.getOwnPropertyDescriptor(window, "innerHeight")
  })

  afterEach(() => {
    if (originalInnerHeight) Object.defineProperty(window, "innerHeight", originalInnerHeight)
    else delete (window as { innerHeight?: number }).innerHeight
  })

  it("updates when the visible browser area changes", () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 })
    const { result } = renderHook(() => useVisualViewportHeight())

    expect(result.current).toBe(844)

    act(() => {
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 690 })
      window.dispatchEvent(new Event("resize"))
    })

    expect(result.current).toBe(690)
  })
})
