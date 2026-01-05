import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import type { Drawing, DrawingInput, DrawingSummary, DrawingTreeNode } from "@/shared/types/drawing"

/**
 * LocalStorage implementation of IGraphRepository
 *
 * Stores drawings in browser localStorage.
 * Suitable for:
 * - Development
 * - Single-user applications
 * - Offline-first applications
 *
 * Limitations:
 * - ~5-10MB storage limit
 * - No synchronization across devices
 * - Data lost if localStorage is cleared
 */
export class LocalStorageRepository implements IGraphRepository {
  private readonly STORAGE_KEY = "excaligraph:drawings"
  private readonly VERSION_KEY = "excaligraph:version"
  private readonly CURRENT_VERSION = "1.0.0"

  constructor() {
    this.initializeStorage()
  }

  /**
   * Initialize storage with version check
   */
  private initializeStorage(): void {
    const version = localStorage.getItem(this.VERSION_KEY)

    if (!version) {
      // First time initialization
      localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]))
    } else if (version !== this.CURRENT_VERSION) {
      // Handle version migration if needed
      console.warn(`Storage version mismatch. Current: ${this.CURRENT_VERSION}, Found: ${version}`)
    }
  }

  /**
   * Get all drawings from storage
   */
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

  /**
   * Save all drawings to storage
   */
  private saveAll(drawings: Drawing[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drawings))
    } catch (error) {
      console.error("Failed to write to localStorage:", error)
      throw new Error("Failed to save drawings. Storage might be full.")
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return crypto.randomUUID()
  }

  /**
   * Generic helper to update a drawing
   */
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

    // Check if drawing has children
    const hasChildren = drawings.some((d) => d.parent_id === id)
    if (hasChildren) {
      throw new Error(
        "Cannot delete drawing with children. Please delete or reassign children first."
      )
    }

    const filtered = drawings.filter((d) => d.id !== id)

    if (filtered.length === drawings.length) {
      throw new Error(`Drawing ${id} not found`)
    }

    this.saveAll(filtered)
  }

  async listDrawings(): Promise<Drawing[]> {
    return this.getAll()
  }

  async getDrawingsTree(): Promise<DrawingTreeNode[]> {
    const drawings = this.getAll()

    // Build tree structure
    const drawingMap = new Map<string, DrawingTreeNode>()
    const rootNodes: DrawingTreeNode[] = []

    // First pass: create all nodes
    for (const drawing of drawings) {
      drawingMap.set(drawing.id, { ...drawing, children: [] })
    }

    // Second pass: build tree
    for (const drawing of drawings) {
      const node = drawingMap.get(drawing.id)
      if (!node) continue

      const parent = drawing.parent_id ? drawingMap.get(drawing.parent_id) : null

      if (parent) {
        // Add to parent's children
        parent.children ??= []
        parent.children.push(node)
      } else {
        // No parent or parent not found - treat as root
        rootNodes.push(node)
      }
    }

    return rootNodes
  }

  async setDrawingParent(id: string, parentId: string | null): Promise<void> {
    const drawings = this.getAll()

    const drawingMap = new Map(drawings.map((d) => [d.id, d]))

    const drawing = drawingMap.get(id)
    if (!drawing) {
      throw new Error(`Drawing ${id} not found`)
    }

    // Prevent self-reference
    if (id === parentId) {
      throw new Error("A drawing cannot be its own parent")
    }

    // Check for circular reference - O(d) with O(1) lookups
    if (parentId) {
      const parentExists = drawingMap.has(parentId)
      if (!parentExists) {
        throw new Error(`Parent drawing ${parentId} not found`)
      }

      // Walk up the parent chain to detect cycles
      let currentParentId: string | null = parentId
      const visited = new Set<string>([id])

      while (currentParentId) {
        if (visited.has(currentParentId)) {
          throw new Error("This would create a circular reference")
        }
        visited.add(currentParentId)

        const parent = drawingMap.get(currentParentId) // O(1) instead of O(n)
        if (!parent) break
        currentParentId = parent.parent_id
      }
    }

    // Update parent
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
