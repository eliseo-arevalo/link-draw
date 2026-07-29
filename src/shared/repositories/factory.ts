import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import type { Drawing, DrawingInput, DrawingSummary, DrawingTreeNode } from "@/shared/types/drawing"
import { IndexedDBRepository } from "./indexedDB/IndexedDBRepository"
import { LocalStorageRepository } from "./localStorage/LocalStorageRepository"
import { getPersistedStorageEngine, markStorageEngineAuthoritative } from "./storageKeys"

/**
 * Thrown when IndexedDB was previously established as the authoritative
 * storage engine (see storageKeys.ts) but cannot be opened on a later
 * startup.
 *
 * We deliberately do NOT fall back to LocalStorageRepository in this case:
 * once IndexedDB holds the source of truth, the localStorage copy is stale
 * (or absent), and silently resurrecting/reusing it would show the user
 * outdated data - or an empty app - without any warning. Instead every
 * IGraphRepository operation rejects with this error so the UI can surface
 * a clear "primary storage unavailable" message.
 */
export class StorageEngineUnavailableError extends Error {
  constructor(cause?: unknown) {
    super(
      "Primary storage (IndexedDB) is unavailable. Your data has not been lost, " +
        "but the app cannot access it right now. Check browser storage " +
        "permissions/private browsing settings and reload the page."
    )
    this.name = "StorageEngineUnavailableError"
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}

export class LazyGraphRepository implements IGraphRepository {
  private repoPromise: Promise<IGraphRepository>

  constructor() {
    this.repoPromise = this.initRepo()
    // Silence "unhandled rejection" warnings for the initial init failure
    // path (IndexedDB authoritative + open fails). Real callers still
    // observe the rejection through getRepo()/every wrapped method below,
    // since attaching this no-op handler here does not consume the
    // rejection for other consumers of the same promise.
    this.repoPromise.catch(() => {})
  }

  private async initRepo(): Promise<IGraphRepository> {
    const previousEngine = getPersistedStorageEngine()

    // Once IndexedDB has been established as authoritative, we never
    // automatically switch engines again - a later failure to open must
    // surface as an error, not a silent, stale fallback.
    if (previousEngine === "indexeddb") {
      return this.reopenAuthoritativeIndexedDB()
    }

    if (typeof indexedDB === "undefined") {
      console.warn("[GraphRepository] indexedDB is undefined. Using LocalStorageRepository.")
      return new LocalStorageRepository()
    }

    try {
      const repo = new IndexedDBRepository()
      await repo.initForFactory()
      markStorageEngineAuthoritative("indexeddb")
      console.log("[GraphRepository] Selected engine: IndexedDBRepository")
      return repo
    } catch (error) {
      console.warn(
        "[GraphRepository] IndexedDB initialization failed. Falling back to LocalStorageRepository:",
        error
      )
      return new LocalStorageRepository()
    }
  }

  private async reopenAuthoritativeIndexedDB(): Promise<IGraphRepository> {
    if (typeof indexedDB === "undefined") {
      throw new StorageEngineUnavailableError(
        new Error("indexedDB is undefined in this environment")
      )
    }

    try {
      const repo = new IndexedDBRepository()
      await repo.initForFactory()
      console.log("[GraphRepository] Re-opened authoritative engine: IndexedDBRepository")
      return repo
    } catch (error) {
      console.error(
        "[GraphRepository] IndexedDB was previously authoritative but failed to open. " +
          "Refusing to fall back to LocalStorageRepository (would show stale/empty data):",
        error
      )
      throw new StorageEngineUnavailableError(error)
    }
  }

  private async getRepo(): Promise<IGraphRepository> {
    return this.repoPromise
  }

  async createDrawing(title: string, parentId?: string | null): Promise<string> {
    const repo = await this.getRepo()
    return repo.createDrawing(title, parentId)
  }

  async saveDrawing(id: string, data: DrawingInput): Promise<void> {
    const repo = await this.getRepo()
    return repo.saveDrawing(id, data)
  }

  async loadDrawing(id: string): Promise<Drawing | null> {
    const repo = await this.getRepo()
    return repo.loadDrawing(id)
  }

  async deleteDrawing(id: string): Promise<void> {
    const repo = await this.getRepo()
    return repo.deleteDrawing(id)
  }

  async listDrawings(): Promise<Drawing[]> {
    const repo = await this.getRepo()
    return repo.listDrawings()
  }

  async getDrawingsTree(): Promise<DrawingTreeNode[]> {
    const repo = await this.getRepo()
    return repo.getDrawingsTree()
  }

  async setDrawingParent(id: string, parentId: string | null): Promise<void> {
    const repo = await this.getRepo()
    return repo.setDrawingParent(id, parentId)
  }

  async getDrawingChildren(id: string): Promise<Drawing[]> {
    const repo = await this.getRepo()
    return repo.getDrawingChildren(id)
  }

  async updateDrawingTitle(id: string, title: string): Promise<void> {
    const repo = await this.getRepo()
    return repo.updateDrawingTitle(id, title)
  }

  async togglePublic(id: string, isPublic: boolean): Promise<void> {
    const repo = await this.getRepo()
    return repo.togglePublic(id, isPublic)
  }

  async getDrawingSummaries(): Promise<DrawingSummary[]> {
    const repo = await this.getRepo()
    return repo.getDrawingSummaries()
  }

  async exists(id: string): Promise<boolean> {
    const repo = await this.getRepo()
    return repo.exists(id)
  }

  async duplicateDrawing(id: string, includeChildren: boolean): Promise<string> {
    const repo = await this.getRepo()
    return repo.duplicateDrawing(id, includeChildren)
  }

  async replaceAllDrawings(drawings: Drawing[]): Promise<void> {
    const repo = await this.getRepo()
    return repo.replaceAllDrawings(drawings)
  }
}

/**
 * Factory function to create a graph repository instance.
 * Synchronously returns a LazyGraphRepository wrapper that asynchronously initializes IndexedDBRepository.
 *
 * Engine selection & authority policy (see storageKeys.ts):
 * - First use (no engine marked authoritative yet): IndexedDB is preferred and,
 *   once fully opened and migrated, marked authoritative. If IndexedDB is
 *   unavailable or fails to open, LocalStorageRepository is used instead
 *   (no marker is persisted, so IndexedDB is retried on the next startup).
 * - Once IndexedDB has been marked authoritative: it is never abandoned for
 *   LocalStorageRepository again. If it fails to open on a later startup,
 *   every IGraphRepository operation rejects with StorageEngineUnavailableError
 *   instead of silently falling back to the (stale) localStorage backup.
 */
export function createGraphRepository(): IGraphRepository {
  return new LazyGraphRepository()
}
