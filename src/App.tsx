import { useState } from "react"
import { Canvas } from "./features/canvas/Canvas"
import { Explorer } from "./features/explorer/Explorer"
import { Graph } from "./features/graph/Graph"
import { useKeyboardShortcuts } from "./shared/hooks/useKeyboardShortcuts"
import { useThemeDetector } from "./shared/hooks/useThemeDetector"
import { useViewStore } from "./shared/store/viewStore"

function App() {
  const { viewMode, toggleView } = useViewStore()
  const [showSidebar, setShowSidebar] = useState(true)
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

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Explorer
        isCollapsed={!showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onToggleGraph={toggleView}
        isGraphView={viewMode === "graph"}
      />
      <div style={{ flex: 1, overflow: "hidden" }}>
        {viewMode === "canvas" ? <Canvas /> : <Graph />}
      </div>
    </div>
  )
}

export default App
