import { Canvas } from "./features/canvas/Canvas"
import { Sidebar } from "./features/sidebar/Sidebar"

function App() {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Canvas />
      </div>
    </div>
  )
}

export default App
