import { Icon } from "@/shared/components/Icon"
import type { ThemeColors } from "@/shared/styles/theme"

interface ExplorerFooterProps {
  theme: "light" | "dark"
  colors: ThemeColors
  isGraphView: boolean
  onToggleTheme: () => void
  onToggleGraph: () => void
}

export function ExplorerFooter({
  theme,
  colors,
  isGraphView,
  onToggleTheme,
  onToggleGraph,
}: ExplorerFooterProps) {
  return (
    <div
      style={{
        borderTop: `1px solid ${colors.border}`,
        padding: "0.4rem 0.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.backgroundSecondary,
      }}
    >
      <button
        type="button"
        onClick={onToggleTheme}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          padding: "0.2rem 0.4rem",
          borderRadius: "4px",
          fontSize: "0.75rem",
          color: colors.textSecondary,
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.hoverBackground
          e.currentTarget.style.color = colors.text
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
          e.currentTarget.style.color = colors.textSecondary
        }}
        title="Toggle theme"
      >
        <Icon name={theme === "light" ? "moon" : "sun"} size={13} />
        <span>{theme === "light" ? "Dark" : "Light"}</span>
      </button>

      <button
        type="button"
        onClick={onToggleGraph}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          padding: "0.2rem 0.4rem",
          borderRadius: "4px",
          fontSize: "0.75rem",
          color: isGraphView ? colors.accent : colors.textSecondary,
          backgroundColor: isGraphView ? colors.activeBackground : "transparent",
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          if (!isGraphView) {
            e.currentTarget.style.backgroundColor = colors.hoverBackground
            e.currentTarget.style.color = colors.text
          }
        }}
        onMouseLeave={(e) => {
          if (!isGraphView) {
            e.currentTarget.style.backgroundColor = "transparent"
            e.currentTarget.style.color = colors.textSecondary
          }
        }}
        title="Toggle Graph View (Cmd+G)"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <span>Graph</span>
      </button>
    </div>
  )
}
