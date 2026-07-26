import { useEffect, useState } from "react"

function getVisualViewportHeight(): number {
  if (typeof window === "undefined") return 0

  return Math.round(window.visualViewport?.height ?? window.innerHeight)
}

/** Tracks the area that is actually visible when mobile browser chrome or a keyboard changes size. */
export function useVisualViewportHeight(): number {
  const [height, setHeight] = useState(getVisualViewportHeight)

  useEffect(() => {
    const updateHeight = () => setHeight(getVisualViewportHeight())
    const visualViewport = window.visualViewport

    updateHeight()
    window.addEventListener("resize", updateHeight)
    visualViewport?.addEventListener("resize", updateHeight)
    visualViewport?.addEventListener("scroll", updateHeight)

    return () => {
      window.removeEventListener("resize", updateHeight)
      visualViewport?.removeEventListener("resize", updateHeight)
      visualViewport?.removeEventListener("scroll", updateHeight)
    }
  }, [])

  return height
}
