import { useState } from "react"
import { Canvas } from "./features/canvas/Canvas"
import { Explorer } from "./features/explorer/Explorer"
import { Graph } from "./features/graph/Graph"
import { Search } from "./features/search/Search"
import { MobileWarning } from "./shared/components/MobileWarning"
import { useKeyboardShortcuts } from "./shared/hooks/useKeyboardShortcuts"
import { useThemeDetector } from "./shared/hooks/useThemeDetector"
import { useViewStore } from "./shared/store/viewStore"

function App() {
  const { viewMode, toggleView } = useViewStore()
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
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "var(--color-surface-primary, #ffffff)",
      }}
    >
      <MobileWarning />
      {/* Overlay backdrop on mobile */}
      {isMobile && showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
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
          backgroundColor: "var(--color-surface-primary, #ffffff)",
          transition: "all 0.15s ease-out",
        }}
      >
        {viewMode === "canvas" ? <Canvas /> : <Graph />}
      </div>
    </div>
  )
}

export { App }
