import { create } from "zustand"
import { findInTree, getPathToNode, nodeExists } from "@/shared/lib/tree-utils"
import type { DrawingTreeNode } from "@/shared/types/drawing"

interface TreeStore {
  tree: DrawingTreeNode[]
  setTree: (tree: DrawingTreeNode[]) => void
  addDrawingToTree: (drawingId: string, title: string, parentId: string | null) => void
  removeDrawingFromTree: (drawingId: string) => void
  updateTitleInTree: (drawingId: string, newTitle: string) => void
  replaceDrawingId: (tempId: string, realId: string) => void
  findDrawingInTree: (drawingId: string) => DrawingTreeNode | null
  getDrawingPath: (drawingId: string) => string[]
}

export const useTreeStore = create<TreeStore>((set, get) => ({
  tree: [],

  setTree: (tree) => set({ tree }),

  addDrawingToTree: (drawingId, title, parentId) =>
    set((state) => {
      if (nodeExists(state.tree, drawingId)) {
        return state
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
        return { tree: [...state.tree, newNode] }
      }

      return { tree: addNodeToTree(state.tree) }
    }),

  removeDrawingFromTree: (drawingId) =>
    set((state) => {
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Recursive tree deletion
      const removeNodeFromTree = (nodes: DrawingTreeNode[]): DrawingTreeNode[] => {
        const result: DrawingTreeNode[] = []
        for (const node of nodes) {
          if (node.id !== drawingId) {
            if (node.children && node.children.length > 0) {
              result.push({
                ...node,
                children: removeNodeFromTree(node.children),
              })
            } else {
              result.push(node)
            }
          }
        }
        return result
      }

      return { tree: removeNodeFromTree(state.tree) }
    }),

  updateTitleInTree: (drawingId, newTitle) =>
    set((state) => {
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

      return { tree: updateNodeTitle(state.tree) }
    }),

  replaceDrawingId: (tempId, realId) =>
    set((state) => {
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

      return { tree: replaceIdInTree(state.tree) }
    }),

  findDrawingInTree: (drawingId) => {
    const tree = get().tree
    return findInTree(tree, (node) => node.id === drawingId)
  },

  getDrawingPath: (drawingId) => {
    const tree = get().tree
    return getPathToNode(tree, drawingId)
  },
}))
