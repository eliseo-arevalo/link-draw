import type { BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
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

    this.api.updateScene({
      elements: content.elements,
      appState: content.appState as unknown as ExcalidrawAppState,
    })
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

    this.api.updateScene({
      appState: {
        scrollX: -element.x + window.innerWidth / 2,
        scrollY: -element.y + window.innerHeight / 2,
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
}
