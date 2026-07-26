import { useEffect, useRef, useState } from "react"
import { generateUniqueDrawingName } from "@/shared/lib/drawing-names"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useTreeStore } from "@/shared/store/treeStore"
import { useExpandedNodes } from "./useExpandedNodes"

export function useTreeNode(
  nodeId: string,
  nodeTitle: string,
  activeId: string | null,
  hasChildren: boolean
) {
  const { repository } = useServices()
  const { tree, setTree } = useTreeStore()
  const { setActiveDrawingId } = useDrawingStore()

  const { isExpanded, setIsExpanded } = useExpandedNodes(nodeId, hasChildren)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(nodeTitle)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Listen for edit-node events
  useEffect(() => {
    const handleEditNode = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string }>
      if (customEvent.detail.nodeId === nodeId) {
        setIsEditing(true)
      }
    }

    window.addEventListener("edit-node", handleEditNode)
    return () => window.removeEventListener("edit-node", handleEditNode)
  }, [nodeId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      // Verificar si el click está dentro del menuRef O dentro de un dropdown menu
      const isInsideMenu = menuRef.current?.contains(target)
      const isInsideDropdown = (target as Element).closest?.('[data-dropdown-menu="true"]')

      if (!isInsideMenu && !isInsideDropdown) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMenuOpen])

  const handleSaveTitle = async () => {
    const newTitle = editedTitle.trim() || nodeTitle
    if (newTitle !== nodeTitle) {
      try {
        await repository.updateDrawingTitle(nodeId, newTitle)
        const updatedTree = await repository.getDrawingsTree()
        setTree(updatedTree)
      } catch (err) {
        console.error("[TreeNode] Failed to update title:", err)
        setEditedTitle(nodeTitle)
      }
    }
    setIsEditing(false)
  }

  const handleCreateChild = async () => {
    setIsMenuOpen(false)
    try {
      const uniqueName = generateUniqueDrawingName(tree)
      const childId = await repository.createDrawing(uniqueName, nodeId)
      await repository.saveDrawing(childId, {
        content: { elements: [], appState: {}, files: {} },
      })
      const updatedTree = await repository.getDrawingsTree()
      setTree(updatedTree)
      setActiveDrawingId(childId)

      // Trigger edit mode for the new child
      setTimeout(() => {
        const event = new CustomEvent("edit-node", { detail: { nodeId: childId } })
        window.dispatchEvent(event)
      }, 100)
    } catch (err) {
      console.error("[TreeNode] Failed to create child:", err)
    }
  }

  const handleDelete = () => {
    setIsMenuOpen(false)
    // Pequeño delay para que el menú se cierre antes de mostrar el modal
    setTimeout(() => {
      setShowDeleteConfirm(true)
    }, 100)
  }

  const confirmDelete = async () => {
    try {
      await repository.deleteDrawing(nodeId)
      const updatedTree = await repository.getDrawingsTree()
      setTree(updatedTree)
      if (activeId === nodeId) {
        setActiveDrawingId(null)
      }
    } catch (err) {
      console.error("[TreeNode] Failed to delete drawing:", err)
    }
    setShowDeleteConfirm(false)
  }

  return {
    isExpanded,
    setIsExpanded,
    isEditing,
    setIsEditing,
    editedTitle,
    setEditedTitle,
    isMenuOpen,
    setIsMenuOpen,
    showDeleteConfirm,
    setShowDeleteConfirm,
    inputRef,
    menuRef,
    handleSaveTitle,
    handleCreateChild,
    handleDelete,
    confirmDelete,
  }
}
