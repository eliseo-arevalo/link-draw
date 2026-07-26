import { useState } from "react"
import { Canvas } from "./features/canvas/Canvas"
import { Explorer } from "./features/explorer/Explorer"
import { Graph } from "./features/graph/Graph"
import { Search } from "./features/search/Search"
import { MobileWarning } from "./shared/components/MobileWarning"
import { useKeyboardShortcuts } from "./shared/hooks/useKeyboardShortcuts"
import { useThemeDetector } from "./shared/hooks/useThemeDetector"
import { useThemeStore } from "./shared/store/themeStore"
import { useViewStore } from "./shared/store/viewStore"
import { getThemeColors } from "./shared/styles/theme"

function App() {
  const { viewMode, toggleView } = useViewStore()
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)
  const [showSidebar, setShowSidebar] = useState(() => window.innerWidth >= 768)
  useThemeDetector() // Detectar cambios de theme

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
      handler: () => setShowSidebar(!showSidebar),
      description: "Toggle sidebar",
    },
  ])

  const isMobile = window.innerWidth < 768

  return (
    <main
      aria-label="LinkDraw visual workspace"
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: colors.background,
      }}
    >
      <h1 className="sr-only">LinkDraw — Connected canvases for visual thinking</h1>
      <MobileWarning />
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
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
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
          overflow: "hidden",
          backgroundColor: colors.background,
        }}
      >
        {viewMode === "canvas" ? <Canvas /> : <Graph />}
      </div>
    </main>
  )
}

export { App }
