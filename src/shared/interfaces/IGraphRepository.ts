import type { Drawing, DrawingInput, DrawingSummary, DrawingTreeNode } from "../types/drawing"

/**
 * Repository interface for drawing persistence
 *
 * This interface abstracts the persistence layer, allowing different implementations:
 * - LocalStorageRepository (client-side)
 * - SupabaseRepository (server-side)
 * - IndexedDBRepository (client-side, large data)
 */
export interface IGraphRepository {
  /**
   * Create a new drawing
   * @param title - Drawing title
   * @param parentId - Optional parent drawing ID
   * @returns The created drawing ID
   */
  createDrawing(title: string, parentId?: string | null): Promise<string>

  /**
   * Save drawing content
   * @param id - Drawing ID
   * @param data - Drawing data to save
   */
  saveDrawing(id: string, data: DrawingInput): Promise<void>

  /**
   * Load a drawing by ID
   * @param id - Drawing ID
   * @returns The drawing or null if not found
   */
  loadDrawing(id: string): Promise<Drawing | null>

  /**
   * Delete a drawing
   * @param id - Drawing ID
   * @throws Error if drawing has children
   */
  deleteDrawing(id: string): Promise<void>

  /**
   * List all drawings (flat list)
   * @returns Array of all drawings
   */
  listDrawings(): Promise<Drawing[]>

  /**
   * Get drawings as a tree structure
   * @returns Array of root drawings with nested children
   */
  getDrawingsTree(): Promise<DrawingTreeNode[]>

  /**
   * Set or change the parent of a drawing
   * @param id - Drawing ID
   * @param parentId - New parent ID (null for root)
   * @throws Error if it would create a circular reference
   */
  setDrawingParent(id: string, parentId: string | null): Promise<void>

  /**
   * Get direct children of a drawing
   * @param id - Parent drawing ID
   * @returns Array of child drawings
   */
  getDrawingChildren(id: string): Promise<Drawing[]>

  /**
   * Update drawing title
   * @param id - Drawing ID
   * @param title - New title
   */
  updateDrawingTitle(id: string, title: string): Promise<void>

  /**
   * Toggle public/private status
   * @param id - Drawing ID
   * @param isPublic - Public status
   */
  togglePublic(id: string, isPublic: boolean): Promise<void>

  /**
   * Get drawing summaries (lightweight, for lists)
   * @returns Array of drawing summaries
   */
  getDrawingSummaries(): Promise<DrawingSummary[]>

  /**
   * Check if a drawing exists
   * @param id - Drawing ID
   * @returns True if drawing exists
   */
  exists(id: string): Promise<boolean>

  /**
   * Duplicate a drawing
   * @param id - Drawing ID to duplicate
   * @param includeChildren - Whether to duplicate children recursively
   * @returns The new drawing ID
   */
  duplicateDrawing(id: string, includeChildren: boolean): Promise<string>
}
