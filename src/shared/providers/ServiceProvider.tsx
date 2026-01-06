import { createContext, useContext, type ReactNode } from "react"
import { LocalStorageRepository } from "@/shared/repositories/localStorage/LocalStorageRepository"
import { ExcalidrawAdapter } from "@/shared/adapters/excalidraw/ExcalidrawAdapter"
import { DrawingService } from "@/shared/services/DrawingService"

interface Services {
  repository: LocalStorageRepository
  adapter: ExcalidrawAdapter
  drawingService: DrawingService
}

const ServiceContext = createContext<Services | null>(null)

const repository = new LocalStorageRepository()
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
