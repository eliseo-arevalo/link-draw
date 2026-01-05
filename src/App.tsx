import { useState } from "react"
import { Canvas } from "./features/canvas/Canvas"
import { DrawingsExplorer } from "./features/explorer/DrawingsExplorer"
import { GraphView } from "./features/graph/GraphView"
import { useViewStore } from "./shared/store/viewStore"
import { useKeyboardShortcuts } from "./shared/hooks/useKeyboardShortcuts"

function App() {
  const { viewMode, toggleView } = useViewStore()
  const [showSidebar, setShowSidebar] = useState(true)

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
      <DrawingsExplorer 
        isCollapsed={!showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onToggleGraph={toggleView}
        isGraphView={viewMode === "graph"}
      />
      <div style={{ flex: 1, overflow: "hidden" }}>
        {viewMode === "canvas" ? <Canvas /> : <GraphView />}
      </div>
    </div>
  )
}

export default App
