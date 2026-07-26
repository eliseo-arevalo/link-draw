import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@excalidraw/excalidraw/index.css"
import "./index.css"
import { App } from "./App"
import { initializeAnalytics } from "./shared/lib/analytics"
import { ServiceProvider } from "./shared/providers/ServiceProvider"

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Root element not found")
}

initializeAnalytics()

createRoot(rootElement).render(
  <StrictMode>
    <ServiceProvider>
      <App />
    </ServiceProvider>
  </StrictMode>
)
