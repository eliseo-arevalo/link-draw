import { useEffect } from "react"

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  handler: () => void
  description: string
}

function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
  if (!keyMatch) return false

  // On Mac, Cmd is meta, on Windows/Linux, Ctrl is ctrl
  const hasModifier = shortcut.ctrl || shortcut.meta
  const modifierMatch = hasModifier ? (event.ctrlKey || event.metaKey) : (!event.ctrlKey && !event.metaKey)
  
  const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
  const altMatch = shortcut.alt ? event.altKey : !event.altKey

  return modifierMatch && shiftMatch && altMatch
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault()
          shortcut.handler()
          break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts])
}
