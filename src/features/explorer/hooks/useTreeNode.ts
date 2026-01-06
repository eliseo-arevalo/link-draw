import { useEffect, useRef, useState } from "react"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useTreeStore } from "@/shared/store/treeStore"

export function useTreeNode(nodeId: string, nodeTitle: string, activeId: string | null) {
  const { repository } = useServices()
  const { setTree } = useTreeStore()
  const { setActiveDrawingId } = useDrawingStore()

  const [isExpanded, setIsExpanded] = useState(true)
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
      const childId = await repository.createDrawing("New Drawing", nodeId)
      await repository.saveDrawing(childId, {
        content: { elements: [], appState: {}, files: {} },
      })
      const updatedTree = await repository.getDrawingsTree()
      setTree(updatedTree)
      setActiveDrawingId(childId)
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
