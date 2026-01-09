import { Icon } from "@/shared/components/Icon"
import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"
import type { DrawingTreeNode } from "@/shared/types/drawing"
import { useTreeNode } from "../hooks/useTreeNode"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"
import { TreeNodeMenu } from "./TreeNodeMenu"

interface TreeNodeProps {
  node: DrawingTreeNode
  level: number
  activeId: string | null
  onSelect: (id: string) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (draggedId: string, targetId: string | null) => void
  onDragEnd: () => void
  onDuplicate: (id: string, includeChildren: boolean) => void
  draggedId: string | null
  dragOverId: string | null
}

const getNodeStyles = (
  level: number,
  isActive: boolean,
  isDragging: boolean,
  isDragOver: boolean
) => ({
  paddingLeft: `${level * 1.25 + 1}rem`,
  backgroundColor: isDragOver
    ? "rgba(99, 102, 241, 0.1)"
    : isActive
      ? "var(--excalidraw-bg-secondary)"
      : "transparent",
  borderLeft: isActive ? "2px solid var(--excalidraw-button-primary)" : "2px solid transparent",
  opacity: isDragging ? 0.5 : 1,
  cursor: isDragging ? "grabbing" : "pointer",
})

const handleNodeDrop = (
  e: React.DragEvent,
  nodeId: string,
  draggedId: string | null,
  onDrop: (draggedId: string, targetId: string | null) => void
) => {
  e.preventDefault()
  e.stopPropagation()
  if (draggedId && draggedId !== nodeId) {
    onDrop(draggedId, nodeId)
  }
}

export function TreeNode({
  node,
  level,
  activeId,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDuplicate,
  draggedId,
  dragOverId,
}: TreeNodeProps) {
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)
  const hasChildren = node.children && node.children.length > 0
  const isActive = activeId === node.id
  const isDragging = draggedId === node.id
  const isDragOver = dragOverId === node.id

  const {
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
  } = useTreeNode(node.id, node.title, activeId)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle()
    } else if (e.key === "Escape") {
      setEditedTitle(node.title)
      setIsEditing(false)
    }
  }

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        draggable={!isEditing}
        onDragStart={(e) => onDragStart(e, node.id)}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDrop={(e) => handleNodeDrop(e, node.id, draggedId, onDrop)}
        onDragEnd={onDragEnd}
        className="flex items-center gap-2 py-1.5 px-4 transition-colors group"
        style={getNodeStyles(level, isActive, isDragging, isDragOver)}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = colors.backgroundSecondary
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            style={{
              padding: "0.125rem",
              minWidth: "1rem",
              height: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <Icon
              name={isExpanded ? "chevronDown" : "chevronRight"}
              size={10}
              color={colors.textSecondary}
            />
          </button>
        ) : (
          <div style={{ width: "1rem" }} />
        )}

        {/* Icon and Title */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !isEditing && onSelect(node.id)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !isEditing) {
              e.preventDefault()
              onSelect(node.id)
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flex: 1,
            cursor: "pointer",
          }}
        >
          <Icon
            name={hasChildren ? "folderOpen" : "file"}
            size={16}
            color={isActive ? "#6366f1" : colors.textSecondary}
          />

          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-sm flex-1"
              style={{
                color: colors.text,
                backgroundColor: colors.background,
                border: "1px solid #6366f1",
                borderRadius: "2px",
                padding: "2px 4px",
                outline: "none",
                fontWeight: 500,
              }}
            />
          ) : (
            <span
              className="text-sm truncate flex-1"
              style={{ color: colors.text, fontWeight: isActive ? 500 : 400 }}
            >
              {node.title}
            </span>
          )}
        </div>

        {/* Menu */}
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ position: "relative", zIndex: 10001 }}
          ref={menuRef}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsMenuOpen(!isMenuOpen)
            }}
            style={{
              padding: "0.25rem",
              minWidth: "1.25rem",
              height: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
            title="More options"
          >
            <Icon name="moreVertical" size={14} color={colors.text} />
          </button>

          <TreeNodeMenu
            isOpen={isMenuOpen}
            anchorRef={menuRef}
            onCreateChild={handleCreateChild}
            onDuplicate={() => {
              onDuplicate(node.id, false)
              setIsMenuOpen(false)
            }}
            onDuplicateWithChildren={() => {
              onDuplicate(node.id, true)
              setIsMenuOpen(false)
            }}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        hasChildren={!!hasChildren}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children?.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              activeId={activeId}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onDuplicate={onDuplicate}
              draggedId={draggedId}
              dragOverId={dragOverId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
