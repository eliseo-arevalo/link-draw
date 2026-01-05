import type { BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { SIDEBAR_WIDTH } from "@/shared/constants/layout"
import type { ICanvasAdapter } from "@/shared/interfaces/ICanvasAdapter"
import { type DrawingLinkInfo, findDrawingLinks } from "@/shared/lib/drawing-links"
import type {
  DrawingLink,
  ExcalidrawAppState,
  ExcalidrawContent,
  ExcalidrawElements,
} from "@/shared/types/drawing"

export class ExcalidrawAdapter implements ICanvasAdapter {
  private api: ExcalidrawImperativeAPI | null = null
  private changeCallbacks: Set<(content: ExcalidrawContent) => void> = new Set()
  private saveCallbacks: Set<() => void> = new Set()
  private lastSavedContent: string | null = null

  setAPI(api: ExcalidrawImperativeAPI): void {
    this.api = api
  }

  getAPI(): ExcalidrawImperativeAPI | null {
    return this.api
  }

  getElements(): ExcalidrawElements {
    if (!this.api) {
      return []
    }
    return this.api.getSceneElements()
  }

  setElements(elements: ExcalidrawElements): void {
    if (!this.api) {
      return
    }
    this.api.updateScene({ elements })
  }

  getAppState(): Partial<ExcalidrawAppState> {
    if (!this.api) {
      return {}
    }
    return this.api.getAppState()
  }

  setAppState(state: Partial<ExcalidrawAppState>): void {
    if (!this.api) {
      return
    }
    this.api.updateScene({ appState: state as unknown as ExcalidrawAppState })
  }

  getFiles(): BinaryFiles {
    if (!this.api) {
      return {}
    }
    return this.api.getFiles()
  }

  getContent(): ExcalidrawContent {
    return {
      elements: this.getElements(),
      appState: this.getAppState(),
      files: this.getFiles(),
    }
  }

  setContent(content: ExcalidrawContent): void {
    if (!this.api) {
      return
    }

    // Don't pass appState to avoid Excalidraw bugs
    // Let Excalidraw use its own defaults
    this.api.updateScene({
      elements: content.elements || [],
    })

    // Add files if they exist
    if (content.files && Object.keys(content.files).length > 0) {
      this.api.addFiles(Object.values(content.files))
    }
  }

  extractDrawingLinks(): DrawingLink[] {
    const elements = this.getElements()
    const linkInfos: DrawingLinkInfo[] = findDrawingLinks(elements)

    return linkInfos.map((info) => ({
      elementId: info.elementId,
      targetDrawingId: info.drawingId,
      targetType: info.targetType,
    }))
  }

  hasUnsavedChanges(): boolean {
    const currentContent = JSON.stringify(this.getContent())
    return this.lastSavedContent !== currentContent
  }

  markAsSaved(): void {
    this.lastSavedContent = JSON.stringify(this.getContent())
  }

  clear(): void {
    if (!this.api) {
      return
    }

    this.api.updateScene({
      elements: [],
      appState: {
        viewBackgroundColor: "#ffffff",
      },
    })
  }

  onChange(callback: (content: ExcalidrawContent) => void): () => void {
    this.changeCallbacks.add(callback)
    return () => this.changeCallbacks.delete(callback)
  }

  onSave(callback: () => void): () => void {
    this.saveCallbacks.add(callback)
    return () => this.saveCallbacks.delete(callback)
  }

  notifyChange(): void {
    const content = this.getContent()
    for (const callback of this.changeCallbacks) {
      callback(content)
    }
  }

  notifySave(): void {
    for (const callback of this.saveCallbacks) {
      callback()
    }
  }

  scrollToElement(elementId: string): void {
    if (!this.api) {
      return
    }

    const elements = this.getElements()
    const element = elements.find((el) => el.id === elementId)

    if (!element) {
      return
    }

    // Calcular el centro del elemento
    const elementCenterX = element.x + (element.width || 0) / 2
    const elementCenterY = element.y + (element.height || 0) / 2

    // Obtener el zoom actual
    const appState = this.getAppState()
    const zoom = appState.zoom?.value || 1

    // Calcular ancho del canvas (restando el sidebar)
    const canvasWidth = window.innerWidth - SIDEBAR_WIDTH

    // Calcular scroll para centrar el elemento en el área visible del canvas
    this.api.updateScene({
      appState: {
        scrollX: canvasWidth / 2 - elementCenterX * zoom,
        scrollY: window.innerHeight / 2 - elementCenterY * zoom,
      },
    })
  }

  highlightElement(elementId: string): void {
    if (!this.api) {
      return
    }

    this.api.updateScene({
      appState: {
        selectedElementIds: { [elementId]: true },
      },
    })
  }

  async exportAsImage(_format: "png" | "svg"): Promise<string> {
    if (!this.api) {
      throw new Error("Excalidraw API not initialized")
    }
    throw new Error("Export not yet implemented")
  }

  getStats(): {
    elementCount: number
    linkCount: number
    fileCount: number
  } {
    const elements = this.getElements()
    const files = this.getFiles()
    const links = this.extractDrawingLinks()

    return {
      elementCount: elements.length,
      linkCount: links.length,
      fileCount: Object.keys(files).length,
    }
  }

  getSelectedElementIds(): string[] {
    if (!this.api) {
      return []
    }
    const appState = this.api.getAppState()
    const selectedIds = appState.selectedElementIds || {}
    return Object.keys(selectedIds).filter((id) => selectedIds[id])
  }

  setElementLink(elementId: string, link: string | null): void {
    if (!this.api) {
      return
    }

    const elements = this.getElements()
    const updatedElements = elements.map((el) => {
      if (el.id === elementId) {
        return { ...el, link }
      }
      return el
    })

    this.api.updateScene({ elements: updatedElements })
  }

  getElementLink(elementId: string): string | null {
    const elements = this.getElements()
    const element = elements.find((el) => el.id === elementId)
    return element?.link ?? null
  }
}
