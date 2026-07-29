import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import type { Drawing, DrawingInput, DrawingSummary, DrawingTreeNode } from "@/shared/types/drawing"
import { validateNoCircularReference } from "../helpers/circular-validator"
import { buildTree } from "../helpers/tree-builder"
import { LinkDrawDatabase } from "./LinkDrawDatabase"
import { migrateFromLocalStorageIfNeeded } from "./migration"

export class IndexedDBRepository implements IGraphRepository {
  private db: LinkDrawDatabase
  private initPromise: Promise<void>

  constructor(dbName = "LinkDrawDB") {
    this.db = new LinkDrawDatabase(dbName)
    this.initPromise = this.init()
  }

  public async init(): Promise<void> {
    await this.db.open()
    await migrateFromLocalStorageIfNeeded(this.db)
  }

  public async initForFactory(): Promise<void> {
    await this.initPromise
  }

  private async ensureInitialized(): Promise<void> {
    await this.initPromise
  }

  private generateId(): string {
    return crypto.randomUUID()
  }

  async createDrawing(title: string, parentId?: string | null): Promise<string> {
    await this.ensureInitialized()

    if (parentId) {
      const parent = await this.db.drawings.get(parentId)
      if (!parent) {
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

    await this.db.drawings.put(newDrawing)
    return id
  }

  async saveDrawing(id: string, data: DrawingInput): Promise<void> {
    await this.ensureInitialized()

    await this.db.transaction("rw", this.db.drawings, async () => {
      const drawing = await this.db.drawings.get(id)
      if (!drawing) {
        throw new Error(`Drawing ${id} not found`)
      }

      const updatedDrawing: Drawing = {
        ...drawing,
        title: data.title?.trim() || drawing.title,
        content: data.content,
        is_public: data.is_public ?? drawing.is_public,
        parent_id: data.parent_id !== undefined ? data.parent_id : drawing.parent_id,
        updated_at: new Date().toISOString(),
      }

      await this.db.drawings.put(updatedDrawing)
    })
  }

  async loadDrawing(id: string): Promise<Drawing | null> {
    await this.ensureInitialized()

    const drawing = await this.db.drawings.get(id)
    return drawing ?? null
  }

  async deleteDrawing(id: string): Promise<void> {
    await this.ensureInitialized()

    await this.db.transaction("rw", this.db.drawings, async () => {
      const drawings = await this.db.drawings.toArray()
      const drawingToDelete = drawings.find((d) => d.id === id)
      if (!drawingToDelete) {
        throw new Error(`Drawing ${id} not found`)
      }

      const childrenMap = new Map<string, string[]>()
      for (const drawing of drawings) {
        if (drawing.parent_id) {
          const children = childrenMap.get(drawing.parent_id) || []
          children.push(drawing.id)
          childrenMap.set(drawing.parent_id, children)
        }
      }

      const idsToDelete = new Set<string>([id])
      const collectDescendants = (parentId: string) => {
        const children = childrenMap.get(parentId) || []
        for (const childId of children) {
          idsToDelete.add(childId)
          collectDescendants(childId)
        }
      }
      collectDescendants(id)

      await this.db.drawings.bulkDelete(Array.from(idsToDelete))
    })
  }

  async listDrawings(): Promise<Drawing[]> {
    await this.ensureInitialized()

    return this.db.drawings.toArray()
  }

  async getDrawingsTree(): Promise<DrawingTreeNode[]> {
    await this.ensureInitialized()

    const drawings = await this.db.drawings.toArray()
    return buildTree(drawings)
  }

  async setDrawingParent(id: string, parentId: string | null): Promise<void> {
    await this.ensureInitialized()

    await this.db.transaction("rw", this.db.drawings, async () => {
      const drawings = await this.db.drawings.toArray()
      const drawingMap = new Map(drawings.map((d) => [d.id, d]))

      const drawing = drawingMap.get(id)
      if (!drawing) {
        throw new Error(`Drawing ${id} not found`)
      }

      validateNoCircularReference(id, parentId, drawingMap)

      drawing.parent_id = parentId
      drawing.updated_at = new Date().toISOString()
      await this.db.drawings.put(drawing)
    })
  }

  async getDrawingChildren(id: string): Promise<Drawing[]> {
    await this.ensureInitialized()

    return this.db.drawings.where("parent_id").equals(id).toArray()
  }

  async updateDrawingTitle(id: string, title: string): Promise<void> {
    await this.ensureInitialized()

    await this.db.transaction("rw", this.db.drawings, async () => {
      const drawing = await this.db.drawings.get(id)
      if (!drawing) {
        throw new Error(`Drawing ${id} not found`)
      }

      drawing.title = title.trim() || "Untitled"
      drawing.updated_at = new Date().toISOString()
      await this.db.drawings.put(drawing)
    })
  }

  async togglePublic(id: string, isPublic: boolean): Promise<void> {
    await this.ensureInitialized()

    await this.db.transaction("rw", this.db.drawings, async () => {
      const drawing = await this.db.drawings.get(id)
      if (!drawing) {
        throw new Error(`Drawing ${id} not found`)
      }

      drawing.is_public = isPublic
      drawing.updated_at = new Date().toISOString()
      await this.db.drawings.put(drawing)
    })
  }

  async getDrawingSummaries(): Promise<DrawingSummary[]> {
    await this.ensureInitialized()

    const drawings = await this.db.drawings.toArray()
    const parentIds = new Set(
      drawings.map((d) => d.parent_id).filter((id): id is string => id !== null)
    )

    return drawings.map((drawing) => ({
      id: drawing.id,
      title: drawing.title,
      created_at: drawing.created_at,
      updated_at: drawing.updated_at,
      parent_id: drawing.parent_id,
      is_public: drawing.is_public,
      elementCount: drawing.content.elements.length,
      hasChildren: parentIds.has(drawing.id),
    }))
  }

  async exists(id: string): Promise<boolean> {
    await this.ensureInitialized()

    const drawing = await this.db.drawings.get(id)
    return drawing !== undefined
  }

  async duplicateDrawing(id: string, includeChildren: boolean): Promise<string> {
    await this.ensureInitialized()

    let newId = ""
    await this.db.transaction("rw", this.db.drawings, async () => {
      const drawings = await this.db.drawings.toArray()
      const original = drawings.find((d) => d.id === id)

      if (!original) {
        throw new Error(`Drawing ${id} not found`)
      }

      const duplicatesToPut: Drawing[] = []
      const duplicateRecursive = (drawingId: string, newParentId: string | null): string => {
        const drawing = drawings.find((d) => d.id === drawingId)
        if (!drawing) return ""

        const createdId = this.generateId()
        const duplicate: Drawing = {
          ...drawing,
          id: createdId,
          title: `${drawing.title} (copy)`,
          parent_id: newParentId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        duplicatesToPut.push(duplicate)

        if (includeChildren) {
          const children = drawings.filter((d) => d.parent_id === drawingId)
          for (const child of children) {
            duplicateRecursive(child.id, createdId)
          }
        }

        return createdId
      }

      newId = duplicateRecursive(id, original.parent_id)
      await this.db.drawings.bulkPut(duplicatesToPut)
    })

    return newId
  }

  async replaceAllDrawings(drawings: Drawing[]): Promise<void> {
    await this.ensureInitialized()

    await this.db.transaction("rw", this.db.drawings, async () => {
      await this.db.drawings.clear()
      await this.db.drawings.bulkPut(drawings)
    })
  }

  /**
   * Helper method for testing/reset
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized()

    await this.db.transaction("rw", [this.db.drawings, this.db.metadata], async () => {
      await this.db.drawings.clear()
      await this.db.metadata.clear()
    })
  }

  /**
   * Close underlying connection
   */
  async close(): Promise<void> {
    await this.ensureInitialized()
    this.db.close()
  }

  /**
   * Access raw database
   */
  getRawDatabase(): LinkDrawDatabase {
    return this.db
  }
}
