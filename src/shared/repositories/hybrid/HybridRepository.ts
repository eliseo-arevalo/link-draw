import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import { LocalStorageRepository } from "@/shared/repositories/localStorage/LocalStorageRepository"
import { useTreeStore } from "@/shared/store/treeStore"
import type { Drawing, DrawingInput, DrawingSummary, DrawingTreeNode } from "@/shared/types/drawing"

export class HybridRepository implements IGraphRepository {
  private localStorage: LocalStorageRepository

  constructor() {
    this.localStorage = new LocalStorageRepository()
  }

  private get syncProvider() {
    return useTreeStore.getState().syncProvider
  }

  private get isCollaborating() {
    return useTreeStore.getState().isCollaborating
  }

  async createDrawing(title: string, parentId?: string | null): Promise<string> {
    if (this.isCollaborating && this.syncProvider) {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const newDrawing: DrawingTreeNode = {
        id,
        title: title || "Untitled",
        content: { elements: [], appState: {}, files: {} },
        created_at: now,
        updated_at: now,
        is_public: false,
        parent_id: parentId || null,
        children: [],
      }

      const currentTree = this.syncProvider.getTree()
      const addNode = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
        if (!parentId) return [...nodes, newDrawing]
        return nodes.map((node) => {
          if (node.id === parentId) {
            return { ...node, children: [...(node.children || []), newDrawing] }
          }
          if (node.children) {
            return { ...node, children: addNode(node.children) }
          }
          return node
        })
      }

      const newTree = addNode(currentTree)
      this.syncProvider.broadcast(newTree)
      return id
    }
    return this.localStorage.createDrawing(title, parentId)
  }

  async saveDrawing(id: string, data: DrawingInput): Promise<void> {
    if (this.isCollaborating && this.syncProvider) {
      const currentTree = this.syncProvider.getTree()

      const updateNode = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
        return nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              ...data,
              children: node.children,
              updated_at: new Date().toISOString(),
            } as DrawingTreeNode
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) }
          }
          return node
        })
      }

      const newTree = updateNode(currentTree)
      this.syncProvider.broadcast(newTree)
      return
    }
    return this.localStorage.saveDrawing(id, data)
  }

  async loadDrawing(id: string): Promise<Drawing | null> {
    if (this.isCollaborating && this.syncProvider) {
      const drawing = this.syncProvider.getDrawing(id)
      if (drawing) return drawing
    }
    return this.localStorage.loadDrawing(id)
  }

  async deleteDrawing(id: string): Promise<void> {
    if (this.isCollaborating && this.syncProvider) {
      const currentTree = this.syncProvider.getTree()
      const removeNode = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
        return nodes
          .filter((n) => n.id !== id)
          .map((n) => ({
            ...n,
            children: n.children ? removeNode(n.children) : [],
          }))
      }
      this.syncProvider.broadcast(removeNode(currentTree))
      return
    }
    return this.localStorage.deleteDrawing(id)
  }

  async listDrawings(): Promise<Drawing[]> {
    if (this.isCollaborating && this.syncProvider) {
      const tree = this.syncProvider.getTree()
      const flatten = (nodes: DrawingTreeNode[]): Drawing[] => {
        return nodes.flatMap((n) => [n, ...flatten(n.children || [])])
      }
      return flatten(tree)
    }
    return this.localStorage.listDrawings()
  }

  async getDrawingsTree(): Promise<DrawingTreeNode[]> {
    if (this.isCollaborating && this.syncProvider) {
      return this.syncProvider.getTree()
    }
    return this.localStorage.getDrawingsTree()
  }

  async setDrawingParent(id: string, parentId: string | null): Promise<void> {
    if (this.isCollaborating && this.syncProvider) {
      const tree = this.syncProvider.getTree()
      let nodeToMove: DrawingTreeNode | null = null

      const removeNode = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
        const found = nodes.find((n) => n.id === id)
        if (found) {
          nodeToMove = found
          return nodes.filter((n) => n.id !== id)
        }
        return nodes.map((n) => ({
          ...n,
          children: n.children ? removeNode(n.children) : [],
        }))
      }

      const treeWithoutNode = removeNode(tree)

      if (!nodeToMove) throw new Error("Node not found")

      // biome-ignore lint/suspicious/noExplicitAny: Casting for node move
      const movedNode = Object.assign({}, nodeToMove, { parent_id: parentId }) as any as DrawingTreeNode

      const addNode = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
        if (!parentId) return [...nodes, movedNode]
        return nodes.map((n) => {
          if (n.id === parentId) {
            return { ...n, children: [...(n.children || []), movedNode] }
          }
          if (n.children) return { ...n, children: addNode(n.children) }
          return n
        })
      }

      this.syncProvider.broadcast(addNode(treeWithoutNode))
      return
    }
    return this.localStorage.setDrawingParent(id, parentId)
  }

  async getDrawingChildren(id: string): Promise<Drawing[]> {
    if (this.isCollaborating && this.syncProvider) {
      const tree = this.syncProvider.getTree()
      const findNode = (nodes: DrawingTreeNode[]): DrawingTreeNode | null => {
        for (const n of nodes) {
          if (n.id === id) return n
          if (n.children) {
            const found = findNode(n.children)
            if (found) return found
          }
        }
        return null
      }
      const node = findNode(tree)
      return node?.children || []
    }
    return this.localStorage.getDrawingChildren(id)
  }

  async updateDrawingTitle(id: string, title: string): Promise<void> {
    if (this.isCollaborating && this.syncProvider) {
      const currentTree = this.syncProvider.getTree()
      const updateNode = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
        return nodes.map((node) => {
          if (node.id === id) {
            return { ...node, title }
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) }
          }
          return node
        })
      }
      this.syncProvider.broadcast(updateNode(currentTree))
      return
    }
    return this.localStorage.updateDrawingTitle(id, title)
  }

  async togglePublic(id: string, isPublic: boolean): Promise<void> {
    if (this.isCollaborating && this.syncProvider) {
      const currentTree = this.syncProvider.getTree()
      const updateNode = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
        return nodes.map((node) => {
          if (node.id === id) {
            return { ...node, is_public: isPublic }
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) }
          }
          return node
        })
      }
      this.syncProvider.broadcast(updateNode(currentTree))
      return
    }
    return this.localStorage.togglePublic(id, isPublic)
  }

  async getDrawingSummaries(): Promise<DrawingSummary[]> {
    if (this.isCollaborating && this.syncProvider) {
      const list = await this.listDrawings()
      return list.map((d) => ({
        id: d.id,
        title: d.title,
        created_at: d.created_at,
        updated_at: d.updated_at,
        parent_id: d.parent_id,
        is_public: d.is_public,
        elementCount: d.content.elements.length,
        hasChildren: false, // Simplified
      }))
    }
    return this.localStorage.getDrawingSummaries()
  }

  async exists(id: string): Promise<boolean> {
    if (this.isCollaborating && this.syncProvider) {
      return !!this.syncProvider.getDrawing(id)
    }
    return this.localStorage.exists(id)
  }

  async duplicateDrawing(id: string, includeChildren: boolean): Promise<string> {
    if (this.isCollaborating) {
      throw new Error("Duplication not supported in collaboration mode yet")
    }
    return this.localStorage.duplicateDrawing(id, includeChildren)
  }
}
