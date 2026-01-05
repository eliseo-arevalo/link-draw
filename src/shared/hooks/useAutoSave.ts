import { useCallback, useEffect, useRef } from "react"

export interface UseAutoSaveOptions {
  delay?: number
  enabled?: boolean
  onSaveStart?: () => void
  onSaveSuccess?: () => void
  onSaveError?: (error: Error) => void
}

export function useAutoSave(onSave: () => Promise<void>, options: UseAutoSaveOptions = {}) {
  const { delay = 2000, enabled = true, onSaveStart, onSaveSuccess, onSaveError } = options

  const timeoutRef = useRef<number | null>(null)
  const isSavingRef = useRef(false)
  const pendingSaveRef = useRef(false)

  const performSave = useCallback(async () => {
    if (isSavingRef.current) {
      pendingSaveRef.current = true
      return
    }

    try {
      isSavingRef.current = true
      pendingSaveRef.current = false

      onSaveStart?.()
      await onSave()
      onSaveSuccess?.()

      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        setTimeout(() => performSave(), delay)
      }
    } catch (error) {
      onSaveError?.(error as Error)
      console.error("Auto-save failed:", error)
    } finally {
      isSavingRef.current = false
    }
  }, [onSave, onSaveStart, onSaveSuccess, onSaveError, delay])

  const triggerSave = useCallback(() => {
    if (!enabled) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => performSave(), delay)
  }, [enabled, delay, performSave])

  const forceSave = useCallback(async () => {
    if (!enabled) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    await performSave()
  }, [enabled, performSave])

  const cancelSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    triggerSave,
    forceSave,
    cancelSave,
    isSaving: isSavingRef.current,
  }
}

export function useManualSave(onSave: () => Promise<void>) {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()

        try {
          await onSave()
        } catch (error) {
          console.error("Manual save failed:", error)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onSave])
}
