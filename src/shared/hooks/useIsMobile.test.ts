import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useIsMobile } from "./useIsMobile"

let originalInnerWidth: PropertyDescriptor | undefined
let originalMatchMedia: PropertyDescriptor | undefined

describe("useIsMobile", () => {
  beforeEach(() => {
    originalInnerWidth = Object.getOwnPropertyDescriptor(window, "innerWidth")
    originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia")
    Object.defineProperty(window, "matchMedia", { configurable: true, value: undefined })
  })

  afterEach(() => {
    if (originalInnerWidth) Object.defineProperty(window, "innerWidth", originalInnerWidth)
    else delete (window as { innerWidth?: number }).innerWidth

    if (originalMatchMedia) Object.defineProperty(window, "matchMedia", originalMatchMedia)
    else delete (window as { matchMedia?: typeof window.matchMedia }).matchMedia
  })

  it("updates when a viewport crosses the mobile breakpoint", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 })
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)

    act(() => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 })
      window.dispatchEvent(new Event("resize"))
    })

    expect(result.current).toBe(false)
  })
})
