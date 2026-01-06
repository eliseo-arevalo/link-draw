import { useEffect } from "react"
import { useThemeStore } from "@/shared/store/themeStore"

type Theme = "light" | "dark"

const checkDataTheme = (element: HTMLElement): Theme | null => {
  const dataTheme = element.getAttribute("data-theme")
  return dataTheme === "dark" ? "dark" : null
}

const checkDarkClass = (element: HTMLElement): boolean => {
  return element.classList.contains("theme--dark") || element.classList.contains("dark")
}

const detectThemeFromElement = (element: HTMLElement): Theme | null => {
  // Check data-theme attribute
  const dataTheme = checkDataTheme(element)
  if (dataTheme) return dataTheme

  // Check dark classes
  if (checkDarkClass(element)) return "dark"

  return null
}

const detectCurrentTheme = (): Theme => {
  const htmlElement = document.documentElement
  const bodyElement = document.body

  // Check html element
  const htmlTheme = detectThemeFromElement(htmlElement)
  if (htmlTheme) return htmlTheme

  // Check body element
  const bodyTheme = detectThemeFromElement(bodyElement)
  if (bodyTheme) return bodyTheme

  // Check Excalidraw container
  const excalidrawContainer = document.querySelector<HTMLElement>(".excalidraw")
  if (excalidrawContainer) {
    const excalidrawTheme = detectThemeFromElement(excalidrawContainer)
    if (excalidrawTheme) return excalidrawTheme
  }

  // Default to light
  return "light"
}

const observeElement = (observer: MutationObserver, element: Element) => {
  observer.observe(element, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  })
}

export function useThemeDetector() {
  const { setTheme } = useThemeStore()

  useEffect(() => {
    let isFirstDetection = true

    const handleThemeChange = () => {
      // Skip first detection to use saved theme
      if (isFirstDetection) {
        isFirstDetection = false
        return
      }

      const theme = detectCurrentTheme()
      setTheme(theme)
    }

    // Initial detection
    handleThemeChange()

    // Setup mutation observer
    const observer = new MutationObserver(handleThemeChange)

    // Observe html and body
    observeElement(observer, document.documentElement)
    observeElement(observer, document.body)

    // Observe Excalidraw container if exists
    const excalidrawContainer = document.querySelector(".excalidraw")
    if (excalidrawContainer) {
      observeElement(observer, excalidrawContainer)
    }

    return () => {
      observer.disconnect()
    }
  }, [setTheme])

  return useThemeStore.getState().theme
}
