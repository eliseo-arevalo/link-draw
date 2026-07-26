import { Icon } from "@/shared/components/Icon"
import type { ThemeColors } from "@/shared/styles/theme"

interface ExplorerToolbarProps {
  theme: "light" | "dark"
  colors: ThemeColors
  isMobile: boolean
  menuRef: React.RefObject<HTMLDivElement | null>
  onToggleTheme: () => void
  onToggleSidebar: () => void
  onToggleMenu: () => void
  onNewDrawing: () => void
}

export function ExplorerToolbar({
  theme,
  colors,
  isMobile,
  menuRef,
  onToggleTheme,
  onToggleSidebar,
  onToggleMenu,
  onNewDrawing,
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
          onClick={onToggleTheme}
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
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={14} aria-label="Toggle theme" />
        </button>

        {isMobile && (
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
            title="Hide sidebar"
          >
            <Icon name="sidebar" size={14} aria-label="Hide sidebar" />
          </button>
        )}

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
        </div>
      </div>
    </div>
  )
}
