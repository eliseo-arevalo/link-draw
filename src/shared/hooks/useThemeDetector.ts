import { useEffect } from "react"
import { useThemeStore } from "@/shared/store/themeStore"

export function useThemeDetector() {
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
      root.setAttribute("data-theme", "dark")
    } else {
      root.classList.remove("dark")
      root.setAttribute("data-theme", "light")
    }
  }, [theme])

  return theme
}
