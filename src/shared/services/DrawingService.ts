import type { ICanvasAdapter } from "@/shared/interfaces/ICanvasAdapter"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import type { Drawing, DrawingInput, DrawingSummary, DrawingTreeNode } from "@/shared/types/drawing"

export class DrawingService {
  private repository: IGraphRepository
  private canvas: ICanvasAdapter

  constructor(repository: IGraphRepository, canvas: ICanvasAdapter) {
    this.repository = repository
    this.canvas = canvas
  }

  async createDrawing(input: DrawingInput): Promise<string> {
    const title = input.title?.trim() || "Untitled Drawing"
    const drawingId = await this.repository.createDrawing(title, input.parent_id)
    await this.repository.saveDrawing(drawingId, input)
    return drawingId
  }

  async getDrawing(id: string): Promise<Drawing | null> {
    return this.repository.loadDrawing(id)
  }

  async getAllDrawings(): Promise<Drawing[]> {
    return this.repository.listDrawings()
  }

  async getDrawingSummaries(): Promise<DrawingSummary[]> {
    return this.repository.getDrawingSummaries()
  }

  async getDrawingsTree(): Promise<DrawingTreeNode[]> {
    return this.repository.getDrawingsTree()
  }

  async updateTitle(id: string, title: string): Promise<void> {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      throw new Error("Title cannot be empty")
    }

    await this.repository.updateDrawingTitle(id, trimmedTitle)
  }

  async updateContent(id: string): Promise<void> {
    const content = this.canvas.getContent()
    await this.repository.saveDrawing(id, { content })
  }

  async saveCurrentDrawing(id: string, title?: string): Promise<void> {
    const content = this.canvas.getContent()
    await this.repository.saveDrawing(id, { content })

    if (title) {
      await this.updateTitle(id, title)
    }

    this.canvas.markAsSaved()
  }

  async loadDrawing(id: string): Promise<Drawing> {
    const drawing = await this.repository.loadDrawing(id)

    if (!drawing) {
      throw new Error(`Drawing not found: ${id}`)
    }

    this.canvas.setContent(drawing.content)
    this.canvas.markAsSaved()

    return drawing
  }

  async deleteDrawing(id: string): Promise<void> {
    await this.repository.deleteDrawing(id)
  }

  async setParent(drawingId: string, parentId: string | null): Promise<void> {
    await this.repository.setDrawingParent(drawingId, parentId)
  }

  async togglePublic(id: string, isPublic: boolean): Promise<void> {
    await this.repository.togglePublic(id, isPublic)
  }

  async duplicateDrawing(id: string): Promise<string> {
    const original = await this.repository.loadDrawing(id)
    if (!original) {
      throw new Error(`Drawing not found: ${id}`)
    }

    const newId = await this.repository.createDrawing(
      `${original.title} (Copy)`,
      original.parent_id
    )

    await this.repository.saveDrawing(newId, {
      content: original.content,
      is_public: original.is_public,
    })

    return newId
  }

  async exportDrawing(id: string): Promise<string> {
    const drawing = await this.repository.loadDrawing(id)
    if (!drawing) {
      throw new Error(`Drawing not found: ${id}`)
    }
    return JSON.stringify(drawing)
  }

  async importDrawing(data: string): Promise<string> {
    const drawing = JSON.parse(data) as Drawing
    const newId = await this.repository.createDrawing(drawing.title, drawing.parent_id)
    await this.repository.saveDrawing(newId, {
      content: drawing.content,
      is_public: drawing.is_public,
    })
    return newId
  }

  hasUnsavedChanges(): boolean {
    return this.canvas.hasUnsavedChanges()
  }

  getCanvasStats() {
    return this.canvas.getStats()
  }
}
