import { useEffect, useState } from "react"
import { Canvas } from "./features/canvas/Canvas"
import { Explorer } from "./features/explorer/Explorer"
import { Graph } from "./features/graph/Graph"
import { Search } from "./features/search/Search"
import { MobileBottomNavigation } from "./shared/components/MobileNavigation"
import { useIsMobile } from "./shared/hooks/useIsMobile"
import { useKeyboardShortcuts } from "./shared/hooks/useKeyboardShortcuts"
import { useThemeDetector } from "./shared/hooks/useThemeDetector"
import { useVisualViewportHeight } from "./shared/hooks/useVisualViewportHeight"
import { useThemeStore } from "./shared/store/themeStore"
import { useViewStore } from "./shared/store/viewStore"
import { getThemeColors } from "./shared/styles/theme"

function App() {
  const { viewMode, setViewMode, toggleView } = useViewStore()
  const { theme, setTheme } = useThemeStore()
  const colors = getThemeColors(theme)
  const isMobile = useIsMobile()
  const visualViewportHeight = useVisualViewportHeight()
  const [showSidebar, setShowSidebar] = useState(() => !isMobile)
  useThemeDetector() // Detectar cambios de theme

  useEffect(() => {
    setShowSidebar(!isMobile)
  }, [isMobile])

  useKeyboardShortcuts([
    {
      key: "g",
      meta: true,
      handler: toggleView,
      description: "Toggle graph view",
    },
    {
      key: "b",
      meta: true,
      handler: () => setShowSidebar((isOpen) => !isOpen),
      description: "Toggle sidebar",
    },
  ])

  const closeDrawer = () => setShowSidebar(false)
  const openDrawer = () => setShowSidebar(true)
  const selectMobileView = (mode: "canvas" | "graph") => {
    setViewMode(mode)
    closeDrawer()
  }

  return (
    <main
      aria-label="LinkDraw visual workspace"
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        height: isMobile ? `${visualViewportHeight}px` : "100vh",
        minHeight: 0,
        width: "100%",
        ...(isMobile && {
          position: "fixed",
          top: 0,
          right: 0,
          left: 0,
        }),
        overflow: "hidden",
        backgroundColor: colors.background,
      }}
    >
      <h1 className="sr-only">LinkDraw — Connected canvases for visual thinking</h1>
      {/* Overlay backdrop on mobile */}
      {isMobile && showSidebar && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setShowSidebar(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
            border: "none",
            cursor: "pointer",
            width: "100%",
            height: "100%",
          }}
        />
      )}
      <Search />
      <Explorer
        isCollapsed={!showSidebar}
        onToggleSidebar={() => setShowSidebar((isOpen) => !isOpen)}
        onToggleGraph={toggleView}
        isGraphView={viewMode === "graph"}
        isMobile={isMobile}
      />
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          width: isMobile ? "100%" : undefined,
          overflow: "hidden",
          backgroundColor: colors.background,
        }}
      >
        {viewMode === "canvas" ? <Canvas /> : <Graph />}
      </div>
      {isMobile && (
        <MobileBottomNavigation
          colors={colors}
          theme={theme}
          viewMode={viewMode}
          onOpenDrawer={openDrawer}
          onSelectCanvas={() => selectMobileView("canvas")}
          onSelectGraph={() => selectMobileView("graph")}
          onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
        />
      )}
    </main>
  )
}

export { App }
