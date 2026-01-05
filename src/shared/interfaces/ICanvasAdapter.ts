import type { BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import type {
  DrawingLink,
  ExcalidrawAppState,
  ExcalidrawContent,
  ExcalidrawElements,
} from "../types/drawing"

/**
 * Adapter interface for Excalidraw canvas
 *
 * This interface abstracts the Excalidraw API, allowing:
 * - Easy testing with mock implementations
 * - Potential support for other canvas libraries
 * - Centralized canvas operations
 */
export interface ICanvasAdapter {
  /**
   * Get the underlying Excalidraw API
   * @returns Excalidraw imperative API
   */
  getAPI(): ExcalidrawImperativeAPI | null

  /**
   * Get current canvas elements
   * @returns Array of Excalidraw elements
   */
  getElements(): ExcalidrawElements

  /**
   * Set canvas elements
   * @param elements - Elements to set
   */
  setElements(elements: ExcalidrawElements): void

  /**
   * Get current app state
   * @returns Partial Excalidraw app state
   */
  getAppState(): Partial<ExcalidrawAppState>

  /**
   * Set app state
   * @param state - App state to set
   */
  setAppState(state: Partial<ExcalidrawAppState>): void

  /**
   * Get binary files (images, etc.)
   * @returns Binary files object
   */
  getFiles(): BinaryFiles

  /**
   * Get complete canvas content
   * @returns Complete Excalidraw content
   */
  getContent(): ExcalidrawContent

  /**
   * Set complete canvas content
   * @param content - Content to set
   */
  setContent(content: ExcalidrawContent): void

  /**
   * Extract drawing links from current elements
   * @returns Array of drawing links found in elements
   */
  extractDrawingLinks(): DrawingLink[]

  /**
   * Check if canvas has unsaved changes
   * @returns True if there are unsaved changes
   */
  hasUnsavedChanges(): boolean

  /**
   * Mark canvas as saved
   */
  markAsSaved(): void

  /**
   * Clear the canvas
   */
  clear(): void

  /**
   * Register a callback for content changes
   * @param callback - Function to call when content changes
   * @returns Cleanup function to unregister the callback
   */
  onChange(callback: (content: ExcalidrawContent) => void): () => void

  /**
   * Register a callback for save requests (Cmd+S)
   * @param callback - Function to call when save is requested
   * @returns Cleanup function to unregister the callback
   */
  onSave(callback: () => void): () => void

  /**
   * Scroll to a specific element
   * @param elementId - Element ID to scroll to
   */
  scrollToElement(elementId: string): void

  /**
   * Highlight a specific element
   * @param elementId - Element ID to highlight
   */
  highlightElement(elementId: string): void

  /**
   * Export canvas as image
   * @param format - Export format (png, svg)
   * @returns Data URL of the exported image
   */
  exportAsImage(format: "png" | "svg"): Promise<string>

  /**
   * Get canvas statistics
   * @returns Statistics about the canvas content
   */
  getStats(): {
    elementCount: number
    linkCount: number
    fileCount: number
  }

  /**
   * Get currently selected element IDs
   * @returns Array of selected element IDs
   */
  getSelectedElementIds(): string[]

  /**
   * Set a link on an element
   * @param elementId - Element ID to set link on
   * @param link - Link URL to set (or null to remove)
   */
  setElementLink(elementId: string, link: string | null): void

  /**
   * Get link from an element
   * @param elementId - Element ID to get link from
   * @returns Link URL or null
   */
  getElementLink(elementId: string): string | null
}
