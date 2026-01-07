import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import type { Drawing, DrawingInput, DrawingSummary, DrawingTreeNode } from "@/shared/types/drawing"
import { validateNoCircularReference } from "./helpers/circular-validator"
import { buildTree } from "./helpers/tree-builder"

export class LocalStorageRepository implements IGraphRepository {
  private readonly STORAGE_KEY = "excaligraph:drawings"
  private readonly VERSION_KEY = "excaligraph:version"
  private readonly CURRENT_VERSION = "1.0.0"

  constructor() {
    this.initializeStorage()
  }

  private initializeStorage(): void {
    const version = localStorage.getItem(this.VERSION_KEY)

    if (!version) {
      localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]))
    } else if (version !== this.CURRENT_VERSION) {
      console.warn(`Storage version mismatch. Current: ${this.CURRENT_VERSION}, Found: ${version}`)
    }
  }

  private getAll(): Drawing[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      if (!data) return []
      return JSON.parse(data) as Drawing[]
    } catch (error) {
      console.error("Failed to read from localStorage:", error)
      return []
    }
  }

  private saveAll(drawings: Drawing[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drawings))
    } catch (error) {
      console.error("Failed to write to localStorage:", error)
      throw new Error("Failed to save drawings. Storage might be full.")
    }
  }

  private generateId(): string {
    return crypto.randomUUID()
  }

  private updateDrawing(id: string, updater: (drawing: Drawing) => void): void {
    const drawings = this.getAll()
    const drawing = drawings.find((d) => d.id === id)

    if (!drawing) {
      throw new Error(`Drawing ${id} not found`)
    }

    updater(drawing)
    drawing.updated_at = new Date().toISOString()
    this.saveAll(drawings)
  }

  async createDrawing(title: string, parentId?: string | null): Promise<string> {
    const drawings = this.getAll()

    // Validate parent exists if provided
    if (parentId) {
      const parentExists = drawings.some((d) => d.id === parentId)
      if (!parentExists) {
        throw new Error(`Parent drawing ${parentId} not found`)
      }
    }

    const id = this.generateId()
    const now = new Date().toISOString()

    const newDrawing: Drawing = {
      id,
      title: title.trim() || "Untitled",
      content: {
        elements: [],
        appState: {},
        files: {},
      },
      parent_id: parentId ?? null,
      is_public: false,
      created_at: now,
      updated_at: now,
    }

    drawings.push(newDrawing)
    this.saveAll(drawings)

    return id
  }

  async saveDrawing(id: string, data: DrawingInput): Promise<void> {
    const drawings = this.getAll()
    const index = drawings.findIndex((d) => d.id === id)

    if (index === -1) {
      throw new Error(`Drawing ${id} not found`)
    }

    const drawing = drawings[index]

    // Update drawing
    drawings[index] = {
      ...drawing,
      title: data.title?.trim() || drawing.title,
      content: data.content,
      is_public: data.is_public ?? drawing.is_public,
      parent_id: data.parent_id !== undefined ? data.parent_id : drawing.parent_id,
      updated_at: new Date().toISOString(),
    }

    this.saveAll(drawings)
  }

  async loadDrawing(id: string): Promise<Drawing | null> {
    const drawings = this.getAll()
    return drawings.find((d) => d.id === id) ?? null
  }

  async deleteDrawing(id: string): Promise<void> {
    const drawings = this.getAll()

    // Find drawing to delete
    const drawingToDelete = drawings.find((d) => d.id === id)
    if (!drawingToDelete) {
      throw new Error(`Drawing ${id} not found`)
    }

    // Build parent-to-children map once: O(n)
    const childrenMap = new Map<string, string[]>()
    for (const drawing of drawings) {
      if (drawing.parent_id) {
        const children = childrenMap.get(drawing.parent_id) || []
        children.push(drawing.id)
        childrenMap.set(drawing.parent_id, children)
      }
    }

    // Recursively collect all descendant IDs using map: O(d)
    const idsToDelete = new Set<string>([id])
    const collectDescendants = (parentId: string) => {
      const children = childrenMap.get(parentId) || []
      for (const childId of children) {
        idsToDelete.add(childId)
        collectDescendants(childId)
      }
    }
    collectDescendants(id)

    // Filter once: O(n)
    const filtered = drawings.filter((d) => !idsToDelete.has(d.id))

    this.saveAll(filtered)
  }

  async listDrawings(): Promise<Drawing[]> {
    return this.getAll()
  }

  async getDrawingsTree(): Promise<DrawingTreeNode[]> {
    const drawings = this.getAll()
    return buildTree(drawings)
  }

  async setDrawingParent(id: string, parentId: string | null): Promise<void> {
    const drawings = this.getAll()
    const drawingMap = new Map(drawings.map((d) => [d.id, d]))

    const drawing = drawingMap.get(id)
    if (!drawing) {
      throw new Error(`Drawing ${id} not found`)
    }

    validateNoCircularReference(id, parentId, drawingMap)

    drawing.parent_id = parentId
    drawing.updated_at = new Date().toISOString()
    this.saveAll(drawings)
  }

  async getDrawingChildren(id: string): Promise<Drawing[]> {
    const drawings = this.getAll()
    return drawings.filter((d) => d.parent_id === id)
  }

  async updateDrawingTitle(id: string, title: string): Promise<void> {
    this.updateDrawing(id, (drawing) => {
      drawing.title = title.trim() || "Untitled"
    })
  }

  async togglePublic(id: string, isPublic: boolean): Promise<void> {
    this.updateDrawing(id, (drawing) => {
      drawing.is_public = isPublic
    })
  }

  async getDrawingSummaries(): Promise<DrawingSummary[]> {
    const drawings = this.getAll()

    // Build Set of parent IDs - O(n)
    const parentIds = new Set(
      drawings.map((d) => d.parent_id).filter((id): id is string => id !== null)
    )

    // Map with O(1) lookup - O(n) total
    return drawings.map((drawing) => ({
      id: drawing.id,
      title: drawing.title,
      created_at: drawing.created_at,
      updated_at: drawing.updated_at,
      parent_id: drawing.parent_id,
      is_public: drawing.is_public,
      elementCount: drawing.content.elements.length,
      hasChildren: parentIds.has(drawing.id), // O(1) instead of O(n)
    }))
  }

  async exists(id: string): Promise<boolean> {
    const drawings = this.getAll()
    return drawings.some((d) => d.id === id)
  }

  /**
   * Clear all drawings (for testing/reset)
   */
  clearAll(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]))
  }

  /**
   * Export all drawings as JSON
   */
  exportData(): string {
    return localStorage.getItem(this.STORAGE_KEY) ?? "[]"
  }

  /**
   * Import drawings from JSON
   */
  importData(jsonData: string): void {
    try {
      const drawings = JSON.parse(jsonData) as Drawing[]
      this.saveAll(drawings)
    } catch {
      throw new Error("Invalid JSON data")
    }
  }
}
