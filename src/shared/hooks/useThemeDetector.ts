import { useEffect } from "react"
import { useThemeStore } from "@/shared/store/themeStore"

export function useThemeDetector() {
  const { setTheme } = useThemeStore()

  useEffect(() => {
    let isFirstDetection = true
    
    // Detectar theme inicial de Excalidraw
    const detectTheme = () => {
      // En la primera detección, no hacer nada (usar el theme guardado)
      if (isFirstDetection) {
        isFirstDetection = false
        return
      }
      
      // Excalidraw puede usar diferentes métodos para el theme
      const htmlElement = document.documentElement
      const bodyElement = document.body
      
      // Método 1: Atributo data-theme
      const dataTheme = htmlElement.getAttribute("data-theme") || bodyElement.getAttribute("data-theme")
      if (dataTheme === "dark") {
        setTheme("dark")
        return
      }
      
      // Método 2: Clase theme--dark
      if (htmlElement.classList.contains("theme--dark") || bodyElement.classList.contains("theme--dark")) {
        setTheme("dark")
        return
      }
      
      // Método 3: Clase dark
      if (htmlElement.classList.contains("dark") || bodyElement.classList.contains("dark")) {
        setTheme("dark")
        return
      }
      
      // Método 4: Buscar en el contenedor de Excalidraw
      const excalidrawContainer = document.querySelector(".excalidraw")
      if (excalidrawContainer) {
        const isDark = excalidrawContainer.classList.contains("theme--dark") || 
                      excalidrawContainer.classList.contains("dark") ||
                      excalidrawContainer.getAttribute("data-theme") === "dark"
        if (isDark) {
          setTheme("dark")
          return
        }
      }
      
      // Default: light
      setTheme("light")
    }

    // Detectar inmediatamente
    detectTheme()

    // Observar cambios en html y body
    const observer = new MutationObserver(() => {
      detectTheme()
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    })

    // Observar el contenedor de Excalidraw si existe
    const excalidrawContainer = document.querySelector(".excalidraw")
    if (excalidrawContainer) {
      observer.observe(excalidrawContainer, {
        attributes: true,
        attributeFilter: ["class", "data-theme"],
      })
    }

    // NO usar polling - solo detectar cambios reales del usuario
    // const interval = setInterval(detectTheme, 500)

    return () => {
      observer.disconnect()
    }
  }, [setTheme])

  return useThemeStore.getState().theme
}
