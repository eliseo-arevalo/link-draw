import { createContext, type ReactNode, useContext } from "react"
import { ExcalidrawAdapter } from "@/shared/adapters/excalidraw/ExcalidrawAdapter"
import { HybridRepository } from "@/shared/repositories/hybrid/HybridRepository"
import { DrawingService } from "@/shared/services/DrawingService"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"

interface Services {
  repository: IGraphRepository
  adapter: ExcalidrawAdapter
  drawingService: DrawingService
}

const ServiceContext = createContext<Services | null>(null)

const repository = new HybridRepository()
const adapter = new ExcalidrawAdapter()
const drawingService = new DrawingService(repository, adapter)

export function ServiceProvider({ children }: { children: ReactNode }) {
  return (
    <ServiceContext.Provider value={{ repository, adapter, drawingService }}>
      {children}
    </ServiceContext.Provider>
  )
}

export function useServices() {
  const context = useContext(ServiceContext)
  if (!context) {
    throw new Error("useServices must be used within ServiceProvider")
  }
  return context
}
