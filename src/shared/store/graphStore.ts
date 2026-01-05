import { create } from "zustand"
import { findInTree, getPathToNode, nodeExists } from "@/shared/lib/tree-utils"
import type { DrawingTreeNode } from "@/shared/types/drawing"

interface GraphStore {
  // Drawing tree state
  tree: DrawingTreeNode[]
  setTree: (tree: DrawingTreeNode[]) => void

  // Updated titles (single source of truth)
  titles: Map<string, string>
  updateTitle: (drawingId: string, title: string) => void
  getTitle: (drawingId: string) => string | undefined

  // Temporary drawings (not saved in repository yet)
  temporaryDrawings: Set<string>
  markAsTemporary: (drawingId: string) => void
  markAsPermanent: (drawingId: string) => void
  isTemporary: (drawingId: string) => boolean

  // New drawing that needs focus
  newDrawingToFocus: string | null
  setNewDrawingToFocus: (drawingId: string | null) => void

  // Navigation state (optimistic UI)
  activeDrawingId: string | null
  setActiveDrawingId: (drawingId: string | null) => void
  isLoadingDrawing: boolean
  setIsLoadingDrawing: (isLoading: boolean) => void

  // Tree operations
  addDrawingToTree: (
    drawingId: string,
    title: string,
    parentId: string | null,
    isTemporary?: boolean
  ) => void
  removeDrawingFromTree: (drawingId: string) => void
  updateTitleInTree: (drawingId: string, newTitle: string) => void
  replaceDrawingId: (tempId: string, realId: string) => void

  // Utility functions
  findDrawingInTree: (drawingId: string) => DrawingTreeNode | null
  getDrawingPath: (drawingId: string) => string[]
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  tree: [],
  setTree: (tree) => {
    set({ tree })
  },

  titles: new Map(),
  updateTitle: (drawingId, title) =>
    set((state) => {
      const newTitles = new Map(state.titles)
      newTitles.set(drawingId, title)
      return { titles: newTitles }
    }),
  getTitle: (drawingId) => {
    // First try from Map
    const titleFromMap = get().titles.get(drawingId)
    if (titleFromMap) {
      return titleFromMap
    }

    // If not in Map, search in tree using utility
    const tree = get().tree
    const node = findInTree(tree, (n) => n.id === drawingId)
    return node?.title
  },

  temporaryDrawings: new Set(),
  markAsTemporary: (drawingId) =>
    set((state) => {
      const newSet = new Set(state.temporaryDrawings)
      newSet.add(drawingId)
      return { temporaryDrawings: newSet }
    }),
  markAsPermanent: (drawingId) =>
    set((state) => {
      const newSet = new Set(state.temporaryDrawings)
      newSet.delete(drawingId)
      return { temporaryDrawings: newSet }
    }),
  isTemporary: (drawingId) => get().temporaryDrawings.has(drawingId),

  newDrawingToFocus: null,
  setNewDrawingToFocus: (drawingId) => set({ newDrawingToFocus: drawingId }),

  activeDrawingId: null,
  setActiveDrawingId: (drawingId) => set({ activeDrawingId: drawingId }),

  isLoadingDrawing: false,
  setIsLoadingDrawing: (isLoading) => set({ isLoadingDrawing: isLoading }),

  addDrawingToTree: (drawingId, title, parentId, isTemporary = false) =>
    set((state) => {
      // Check if node already exists in tree using utility
      if (nodeExists(state.tree, drawingId)) {
        return state // Don't add duplicate
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

      // Helper function to add node to tree (extracted to avoid duplication)
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

      // If no parentId, add as root node
      if (!parentId) {
        const newTree = [...state.tree, newNode]
        if (isTemporary) {
          const newTemporary = new Set(state.temporaryDrawings)
          newTemporary.add(drawingId)
          return { tree: newTree, temporaryDrawings: newTemporary }
        }
        return { tree: newTree }
      }

      // If has parentId, find parent and add as child
      const newTree = addNodeToTree(state.tree)
      if (isTemporary) {
        const newTemporary = new Set(state.temporaryDrawings)
        newTemporary.add(drawingId)
        return { tree: newTree, temporaryDrawings: newTemporary }
      }
      return { tree: newTree }
    }),

  removeDrawingFromTree: (drawingId) =>
    set((state) => {
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
      // Replace ID in tree
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

      // Replace in titles
      const newTitles = new Map(state.titles)
      const tempTitle = newTitles.get(tempId)
      if (tempTitle) {
        newTitles.delete(tempId)
        newTitles.set(realId, tempTitle)
      }

      // Remove from temporaries
      const newTemporary = new Set(state.temporaryDrawings)
      newTemporary.delete(tempId)

      const newTree = replaceIdInTree(state.tree)

      return {
        tree: newTree,
        titles: newTitles,
        temporaryDrawings: newTemporary,
      }
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
