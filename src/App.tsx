import { Canvas } from "./features/canvas/Canvas"
import { DrawingsExplorer } from "./features/explorer/DrawingsExplorer"

function App() {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <DrawingsExplorer />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Canvas />
      </div>
    </div>
  )
}

export default App
