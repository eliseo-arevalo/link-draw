import type * as Y from "yjs"
import type { DrawingTreeNode, Drawing } from "@/shared/types/drawing"

export interface ISyncProvider {
  /**
   * Connect to a collaboration room
   * @param roomId - Unique room identifier
   * @param password - Optional password for E2E encryption
   */
  connect(roomId: string, password?: string | null): Promise<void>

  /**
   * Disconnect from current room
   */
  disconnect(): void

  /**
   * Subscribe to remote updates
   * @returns Unsubscribe function
   */
  onUpdate(callback: (tree: DrawingTreeNode[]) => void): () => void

  /**
   * Broadcast local changes to peers
   */
  broadcast(tree: DrawingTreeNode[]): void

  /**
   * Get list of connected peers
   */
  getPeers(): string[]

  /**
   * Check if currently connected
   */
  isConnected(): boolean

  /**
   * Get the underlying Y.Doc instance
   * Required for canvas-level collaboration
   */
  getDoc(): Y.Doc | null

  /**
   * Get a drawing from the synced state
   * @param id - Drawing ID
   */
  getDrawing(id: string): Drawing | null

  /**
   * Get the full tree
   */
  getTree(): DrawingTreeNode[]
}
