import { createContext, type ReactNode, useContext } from "react"
import { ExcalidrawAdapter } from "@/shared/adapters/excalidraw/ExcalidrawAdapter"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import { createGraphRepository } from "@/shared/repositories/factory"
import { DrawingService } from "@/shared/services/DrawingService"

import { LinkService } from "@/shared/services/LinkService"
import { ProjectTransferService } from "@/shared/services/ProjectTransferService"

interface Services {
  repository: IGraphRepository
  adapter: ExcalidrawAdapter
  drawingService: DrawingService
  linkService: LinkService
  projectTransferService: ProjectTransferService
}

const ServiceContext = createContext<Services | null>(null)

const repository = createGraphRepository()
const adapter = new ExcalidrawAdapter()
const drawingService = new DrawingService(repository, adapter)
const linkService = new LinkService(repository, adapter)
const projectTransferService = new ProjectTransferService(repository)
const SERVICES_VALUE: Services = {
  repository,
  adapter,
  drawingService,
  linkService,
  projectTransferService,
}

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
