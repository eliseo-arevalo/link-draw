import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAutoSave } from "./useAutoSave"

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("should trigger save after delay", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000 }))

    act(() => {
      result.current.triggerSave()
    })

    expect(onSave).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it("should debounce multiple triggers", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000 }))

    act(() => {
      result.current.triggerSave()
      result.current.triggerSave()
      result.current.triggerSave()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it("should not save when disabled", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000, enabled: false }))

    act(() => {
      result.current.triggerSave()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it("should call lifecycle callbacks", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onSaveStart = vi.fn()
    const onSaveSuccess = vi.fn()

    const { result } = renderHook(() =>
      useAutoSave(onSave, { delay: 100, onSaveStart, onSaveSuccess })
    )

    act(() => {
      result.current.triggerSave()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(onSaveStart).toHaveBeenCalled()
    expect(onSave).toHaveBeenCalled()
    expect(onSaveSuccess).toHaveBeenCalled()
  })

  it("should call onSaveError on failure", async () => {
    const error = new Error("Save failed")
    const onSave = vi.fn().mockRejectedValue(error)
    const onSaveError = vi.fn()

    const { result } = renderHook(() => useAutoSave(onSave, { delay: 100, onSaveError }))

    act(() => {
      result.current.triggerSave()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(onSaveError).toHaveBeenCalledWith(error)
  })

  it("should force save immediately", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000 }))

    await act(async () => {
      await result.current.forceSave()
    })

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it("should cancel pending save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000 }))

    act(() => {
      result.current.triggerSave()
      result.current.cancelSave()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })
})
