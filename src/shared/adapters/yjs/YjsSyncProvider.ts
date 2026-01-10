import type { ISyncProvider } from "@/shared/interfaces/ISyncProvider"
import type { Drawing, DrawingTreeNode } from "@/shared/types/drawing"
import { IndexeddbPersistence } from "y-indexeddb"
import { WebrtcProvider } from "y-webrtc"
import * as Y from "yjs"

export class YjsSyncProvider implements ISyncProvider {
  private ydoc: Y.Doc | null = null
  private webrtcProvider: WebrtcProvider | null = null
  private indexeddbProvider: IndexeddbPersistence | null = null
  private yArray: Y.Array<unknown> | null = null
  private currentRoom: string | null = null

  async connect(roomId: string, password?: string | null): Promise<void> {
    if (this.currentRoom === roomId) return

    // Disconnect previous room
    this.disconnect()

    // Create Yjs document
    this.ydoc = new Y.Doc()
    this.yArray = this.ydoc.getArray("drawings-tree")

    // Setup WebRTC provider (P2P sync)
    this.webrtcProvider = new WebrtcProvider(roomId, this.ydoc, {
      signaling: ["wss://signaling.yjs.dev"], // Use custom server in production
      password: password || null,
    })

    // Setup IndexedDB persistence (local storage)
    this.indexeddbProvider = new IndexeddbPersistence(roomId, this.ydoc)

    await new Promise<void>((resolve) => {
      this.indexeddbProvider?.on("synced", () => resolve())
    })

    this.currentRoom = roomId
  }

  disconnect(): void {
    this.webrtcProvider?.destroy()
    this.indexeddbProvider?.destroy()
    this.ydoc?.destroy()

    this.webrtcProvider = null
    this.indexeddbProvider = null
    this.ydoc = null
    this.yArray = null
    this.currentRoom = null
  }

  onUpdate(callback: (tree: DrawingTreeNode[]) => void): () => void {
    if (!this.yArray) {
      throw new Error("Not connected to a room")
    }

    const observer = () => {
      const data = this.yArray?.toJSON() as DrawingTreeNode[]
      callback(data)
    }

    this.yArray.observe(observer)

    // Initial call to populate state
    observer()

    return () => {
      this.yArray?.unobserve(observer)
    }
  }

  broadcast(tree: DrawingTreeNode[]): void {
    if (!this.yArray || !this.ydoc) {
      throw new Error("Not connected to a room")
    }

    this.ydoc.transact(() => {
      if (!this.yArray) return
      this.yArray.delete(0, this.yArray.length)
      this.yArray.push(tree)
    })
  }

  getPeers(): string[] {
    if (!this.webrtcProvider) return []
    return Array.from(this.webrtcProvider.room?.peers.keys() || [])
  }

  isConnected(): boolean {
    return this.webrtcProvider?.connected || false
  }

  getDoc(): Y.Doc | null {
    return this.ydoc
  }

  getDrawing(id: string): Drawing | null {
    if (!this.yArray) return null
    const tree = this.yArray.toJSON() as DrawingTreeNode[]

    const findInTree = (nodes: DrawingTreeNode[]): Drawing | null => {
      for (const node of nodes) {
        if (node.id === id) return node
        if (node.children) {
          const found = findInTree(node.children)
          if (found) return found
        }
      }
      return null
    }

    return findInTree(tree)
  }

  getTree(): DrawingTreeNode[] {
    if (!this.yArray) return []
    return this.yArray.toJSON() as DrawingTreeNode[]
  }
}
