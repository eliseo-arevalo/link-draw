import { useEffect, useState } from "react"

const MOBILE_MEDIA_QUERY = "(max-width: 767px)"

function getIsMobile(): boolean {
  if (typeof window === "undefined") return false

  return window.matchMedia?.(MOBILE_MEDIA_QUERY).matches ?? window.innerWidth < 768
}

/** Keeps responsive UI in sync with resizing, orientation changes, and split-screen mode. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(getIsMobile)

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(MOBILE_MEDIA_QUERY)
    const updateIsMobile = () => setIsMobile(getIsMobile())

    updateIsMobile()

    if (mediaQuery) {
      mediaQuery.addEventListener("change", updateIsMobile)
      return () => mediaQuery.removeEventListener("change", updateIsMobile)
    }

    window.addEventListener("resize", updateIsMobile)
    return () => window.removeEventListener("resize", updateIsMobile)
  }, [])

  return isMobile
}
