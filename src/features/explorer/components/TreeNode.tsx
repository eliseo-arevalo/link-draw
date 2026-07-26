import { Icon } from "@/shared/components/Icon"
import type { CSSProperties } from "react"
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
  isDragOver: boolean,
  colors: ReturnType<typeof getThemeColors>
): CSSProperties => ({
  paddingLeft: `${level * 1.25 + 0.5}rem`,
  paddingRight: "0.5rem",
  paddingTop: "0.35rem",
  paddingBottom: "0.35rem",
  margin: "1px 6px",
  backgroundColor: isDragOver
    ? colors.activeBackground
    : isActive
      ? colors.activeBackground
      : "transparent",
  borderRadius: "6px",
  borderLeft: "none",
  opacity: isDragging ? 0.4 : 1,
  cursor: isDragging ? "grabbing" : "pointer",
  transition: "background-color 0.15s ease",
  userSelect: "none",
  WebkitUserSelect: "none",
  MozUserSelect: "none",
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Tree node UI rendering requires complex drag and state logic
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
  } = useTreeNode(node.id, node.title, activeId, !!hasChildren)

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
        tabIndex={0}
        aria-expanded={hasChildren ? isExpanded : undefined}
        draggable={!isEditing}
        onDragStart={(e) => {
          if (typeof window !== "undefined") {
            window.__linkdraw_dragged_drawing = { id: node.id, title: node.title }
          }
          e.dataTransfer.setData("application/linkdraw-drawing-id", node.id)
          e.dataTransfer.setData("application/linkdraw-drawing-title", node.title)
          e.dataTransfer.setData("text/plain", `drawing://${node.id}`)
          onDragStart(e, node.id)
        }}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDrop={(e) => handleNodeDrop(e, node.id, draggedId, onDrop)}
        onDragEnd={onDragEnd}
        className="flex items-center gap-1.5 transition-all group"
        style={getNodeStyles(level, isActive, isDragging, isDragOver, colors)}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = colors.hoverBackground
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
              borderRadius: "4px",
              transition: "transform 0.15s ease",
            }}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <Icon
              name={isExpanded ? "chevronDown" : "chevronRight"}
              size={12}
              color={isActive ? colors.accent : colors.textSecondary}
            />
          </button>
        ) : (
          <div style={{ width: "1rem" }} />
        )}

        {/* Icon and Title */}
        {isEditing ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              flex: 1,
              minWidth: 0,
            }}
          >
            <Icon
              name={hasChildren ? "folderOpen" : "file"}
              size={15}
              color={isActive ? colors.iconActive : colors.iconColor}
            />
            <input
              ref={inputRef}
              type="text"
              aria-label="Drawing title"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-sm flex-1 min-w-0 w-full"
              style={{
                color: colors.text,
                backgroundColor: colors.inputBg,
                border: `1px solid ${colors.accent}`,
                borderRadius: "3px",
                padding: "0 4px",
                height: "1.375rem",
                lineHeight: "1.375rem",
                boxSizing: "border-box",
                outline: "none",
                fontWeight: 500,
              }}
            />
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect(node.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
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
              gap: "0.4rem",
              flex: 1,
              minWidth: 0,
              cursor: "pointer",
            }}
          >
            <Icon
              name={hasChildren ? "folderOpen" : "file"}
              size={15}
              color={isActive ? colors.iconActive : colors.iconColor}
            />
            <span
              className="text-sm truncate"
              style={{
                color: isActive ? colors.accent : colors.text,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {node.title}
            </span>

            {/* Active Dot Indicator */}
            {isActive && (
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  backgroundColor: colors.accent,
                  flexShrink: 0,
                }}
                title="Active page"
              />
            )}

            {/* Child count */}
            {hasChildren && !isActive && (
              <span
                style={{
                  fontSize: "11px",
                  color: colors.textSecondary,
                  fontWeight: 400,
                  opacity: 0.7,
                }}
              >
                {node.children?.length}
              </span>
            )}

            {/* Content match indicator */}
            {node.metadata?.matchesContent && (
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  backgroundColor: colors.badgeBg,
                  color: colors.textSecondary,
                  fontWeight: 500,
                }}
                title="Match found in content"
              >
                match
              </span>
            )}
          </div>
        )}

        {/* Action Buttons (visible on hover or when active/menu open) */}
        <div
          className={`flex items-center gap-0.5 transition-opacity ${
            isActive || isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{ position: "relative", zIndex: 10001 }}
          ref={menuRef}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleCreateChild()
            }}
            style={{
              padding: "0.2rem",
              minWidth: "1.25rem",
              height: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderRadius: "4px",
              color: colors.textSecondary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.accentLight
              e.currentTarget.style.color = colors.accent
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = colors.textSecondary
            }}
            title="Add child drawing"
          >
            <Icon name="plus" size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsMenuOpen(!isMenuOpen)
            }}
            style={{
              padding: "0.2rem",
              minWidth: "1.25rem",
              height: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderRadius: "4px",
              color: colors.textSecondary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.hoverBackground
              e.currentTarget.style.color = colors.text
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = colors.textSecondary
            }}
            title="More options"
          >
            <Icon name="moreVertical" size={12} />
          </button>

          <TreeNodeMenu
            isOpen={isMenuOpen}
            anchorRef={menuRef}
            onRename={() => {
              setIsEditing(true)
              setIsMenuOpen(false)
            }}
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
