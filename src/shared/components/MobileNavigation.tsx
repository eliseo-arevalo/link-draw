import { Icon } from "@/shared/components/Icon"
import type { ThemeColors } from "@/shared/styles/theme"

interface MobileNavigationProps {
  colors: ThemeColors
  theme: "light" | "dark"
  viewMode: "canvas" | "graph"
  onOpenDrawer: () => void
  onSelectCanvas: () => void
  onSelectGraph: () => void
  onToggleTheme: () => void
}

const navButtonStyle = {
  minWidth: "44px",
  minHeight: "44px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: "0.15rem",
  border: "none",
  borderRadius: "8px",
  background: "transparent",
  cursor: "pointer",
  fontSize: "0.6875rem",
  fontWeight: 600,
}

export function MobileBottomNavigation({
  colors,
  theme,
  viewMode,
  onOpenDrawer,
  onSelectCanvas,
  onSelectGraph,
  onToggleTheme,
}: MobileNavigationProps) {
  const activeColor = colors.accent
  const inactiveColor = colors.textSecondary

  return (
    <nav
      aria-label="Mobile navigation"
      style={{
        minHeight: "4.25rem",
        padding: "0.25rem 0.5rem max(0.25rem, env(safe-area-inset-bottom))",
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: "0.25rem",
        flexShrink: 0,
        backgroundColor: colors.background,
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      <button
        type="button"
        onClick={onOpenDrawer}
        style={{ ...navButtonStyle, color: inactiveColor }}
      >
        <Icon name="sidebar" size={20} aria-label="Drawings icon" />
        <span>Drawings</span>
      </button>
      <button
        type="button"
        onClick={onSelectCanvas}
        aria-current={viewMode === "canvas" ? "page" : undefined}
        style={{
          ...navButtonStyle,
          color: viewMode === "canvas" ? activeColor : inactiveColor,
          backgroundColor: viewMode === "canvas" ? colors.accentLight : "transparent",
        }}
      >
        <Icon name="file" size={20} aria-label="Canvas icon" />
        <span>Canvas</span>
      </button>
      <button
        type="button"
        onClick={onSelectGraph}
        aria-current={viewMode === "graph" ? "page" : undefined}
        style={{
          ...navButtonStyle,
          color: viewMode === "graph" ? activeColor : inactiveColor,
          backgroundColor: viewMode === "graph" ? colors.accentLight : "transparent",
        }}
      >
        <Icon name="box" size={20} aria-label="Graph icon" />
        <span>Graph</span>
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        style={{ ...navButtonStyle, color: inactiveColor }}
      >
        <Icon name={theme === "light" ? "moon" : "sun"} size={20} aria-label="Theme icon" />
        <span>{theme === "light" ? "Dark" : "Light"}</span>
      </button>
    </nav>
  )
}
