import { create } from "zustand"
import { findInTree, getPathToNode, nodeExists } from "@/shared/lib/tree-utils"
import type { DrawingTreeNode } from "@/shared/types/drawing"
import type { ISyncProvider } from "@/shared/interfaces/ISyncProvider"
import { YjsSyncProvider } from "@/shared/adapters/yjs/YjsSyncProvider"

interface TreeStore {
  tree: DrawingTreeNode[]
  setTree: (tree: DrawingTreeNode[], fromRemote?: boolean) => void
  addDrawingToTree: (drawingId: string, title: string, parentId: string | null) => void
  removeDrawingFromTree: (drawingId: string) => void
  updateTitleInTree: (drawingId: string, newTitle: string) => void
  replaceDrawingId: (tempId: string, realId: string) => void
  findDrawingInTree: (drawingId: string) => DrawingTreeNode | null
  getDrawingPath: (drawingId: string) => string[]

  // Collaboration
  syncProvider: ISyncProvider | null
  collaborationRoom: string | null
  isCollaborating: boolean
  enableCollaboration: (roomId: string, password?: string | null) => Promise<void>
  disableCollaboration: () => void
}

export const useTreeStore = create<TreeStore>((set, get) => ({
  tree: [],
  syncProvider: null,
  collaborationRoom: null,
  isCollaborating: false,

  setTree: (tree, fromRemote = false) => {
    set({ tree })

    // Broadcast if collaborating and change is local
    const { syncProvider, isCollaborating } = get()
    if (isCollaborating && syncProvider && !fromRemote) {
      syncProvider.broadcast(tree)
    }
  },

  enableCollaboration: async (roomId, password) => {
    const provider = new YjsSyncProvider()
    await provider.connect(roomId, password)

    // Subscribe to remote updates
    provider.onUpdate((tree) => {
      // Update local tree without broadcasting back
      get().setTree(tree, true)
    })

    set({
      syncProvider: provider,
      collaborationRoom: roomId,
      isCollaborating: true
    })
  },

  disableCollaboration: () => {
    const { syncProvider } = get()
    syncProvider?.disconnect()
    set({
      syncProvider: null,
      collaborationRoom: null,
      isCollaborating: false
    })
  },

  addDrawingToTree: (drawingId, title, parentId) => {
    const { tree, setTree } = get()

    if (nodeExists(tree, drawingId)) {
      return
    }

    const newNode: DrawingTreeNode = {
      id: drawingId,
      title,
      content: { elements: [], appState: {}, files: {} },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: false,
      parent_id: parentId,
      children: [],
    }

    const addNodeToTree = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
      return nodes.map((node) => {
        if (node.id === parentId) {
          return {
            ...node,
            children: [...(node.children || []), newNode],
          }
        }
        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: addNodeToTree(node.children),
          }
        }
        return node
      })
    }

    if (!parentId) {
      setTree([...tree, newNode])
      return
    }

    setTree(addNodeToTree(tree))
  },

  removeDrawingFromTree: (drawingId) => {
    const { tree, setTree } = get()

    const removeNodeFromTree = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
      return nodes
        .filter((node) => node.id !== drawingId)
        .map((node) => {
          if (node.children && node.children.length > 0) {
            return {
              ...node,
              children: removeNodeFromTree(node.children),
            }
          }
          return node
        })
    }

    setTree(removeNodeFromTree(tree))
  },

  updateTitleInTree: (drawingId, newTitle) => {
    const { tree, setTree } = get()

    const updateNodeTitle = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
      return nodes.map((node) => {
        if (node.id === drawingId) {
          return { ...node, title: newTitle }
        }
        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: updateNodeTitle(node.children),
          }
        }
        return node
      })
    }

    setTree(updateNodeTitle(tree))
  },

  replaceDrawingId: (tempId, realId) => {
    const { tree, setTree } = get()

    const replaceIdInTree = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
      return nodes.map((node) => {
        if (node.id === tempId) {
          return { ...node, id: realId }
        }
        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: replaceIdInTree(node.children),
          }
        }
        return node
      })
    }

    setTree(replaceIdInTree(tree))
  },

  findDrawingInTree: (drawingId) => {
    const tree = get().tree
    return findInTree(tree, (node) => node.id === drawingId)
  },

  getDrawingPath: (drawingId) => {
    const tree = get().tree
    return getPathToNode(tree, drawingId)
  },
}))
