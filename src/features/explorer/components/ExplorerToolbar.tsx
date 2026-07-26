import type { ReactNode } from "react"
import { Icon } from "@/shared/components/Icon"
import type { ThemeColors } from "@/shared/styles/theme"

interface ExplorerToolbarProps {
  colors: ThemeColors
  menuRef: React.RefObject<HTMLDivElement | null>
  onToggleSidebar: () => void
  onToggleMenu: () => void
  onNewDrawing: () => void
  menu?: ReactNode
}

export function ExplorerToolbar({
  colors,
  menuRef,
  onToggleSidebar,
  onToggleMenu,
  onNewDrawing,
  menu,
}: ExplorerToolbarProps) {
  return (
    <div
      style={{
        padding: "0.5rem 0.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: colors.text,
          }}
        >
          LinkDraw
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <button
          type="button"
          onClick={onNewDrawing}
          style={{
            padding: "0.3rem 0.5rem",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            color: colors.accent,
            backgroundColor: colors.accentLight,
            border: "none",
            cursor: "pointer",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
          title="New drawing"
        >
          <Icon name="plus" size={13} aria-label="New drawing" />
          <span>New</span>
        </button>

        <button
          type="button"
          onClick={onToggleSidebar}
          style={{
            padding: "0.3rem",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.textSecondary,
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
          title="Collapse sidebar"
        >
          <Icon name="sidebar" size={14} aria-label="Collapse sidebar" />
        </button>

        <div style={{ position: "relative", zIndex: 10001 }} ref={menuRef}>
          <button
            type="button"
            onClick={onToggleMenu}
            style={{
              padding: "0.3rem",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.textSecondary,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
            title="More options"
          >
            <Icon name="moreVertical" size={14} aria-label="More options" />
          </button>
          {menu}
        </div>
      </div>
    </div>
  )
}
