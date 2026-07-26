import { createContext, type ReactNode, useContext } from "react"
import { ExcalidrawAdapter } from "@/shared/adapters/excalidraw/ExcalidrawAdapter"
import { LocalStorageRepository } from "@/shared/repositories/localStorage/LocalStorageRepository"
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
const SERVICES_VALUE: Services = { repository, adapter, drawingService }

export function ServiceProvider({ children }: { children: ReactNode }) {
  return <ServiceContext.Provider value={SERVICES_VALUE}>{children}</ServiceContext.Provider>
}

export function useServices() {
  const context = useContext(ServiceContext)
  if (!context) {
    throw new Error("useServices must be used within ServiceProvider")
  }
  return context
}
