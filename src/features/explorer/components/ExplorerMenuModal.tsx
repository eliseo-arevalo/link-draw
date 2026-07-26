import { Icon } from "@/shared/components/Icon"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import { useThemeStore } from "@/shared/store/themeStore"
import type { ThemeColors } from "@/shared/styles/theme"
import type { DrawingTreeNode } from "@/shared/types/drawing"

interface ExplorerMenuModalProps {
  colors: ThemeColors
  isGraphView: boolean
  repository: IGraphRepository
  onCloseMenu: () => void
  onToggleSearch: () => void
  onToggleGraph: () => void
  onTreeUpdated: (newTree: DrawingTreeNode[]) => void
  onResetActiveDrawing: () => void
  onError: (msg: string) => void
}

export function ExplorerMenuModal({
  colors,
  isGraphView,
  repository,
  onCloseMenu,
  onToggleSearch,
  onToggleGraph,
  onTreeUpdated,
  onResetActiveDrawing,
  onError,
}: ExplorerMenuModalProps) {
  const handleExport = async () => {
    try {
      const drawings = await repository.listDrawings()
      const data = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        drawings,
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `linkdraw-export-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      onCloseMenu()
    } catch (err) {
      console.error("Export failed:", err)
      onError("Failed to export project")
    }
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        if (!data.drawings || !Array.isArray(data.drawings)) {
          throw new Error("Invalid file format")
        }

        localStorage.setItem("linkdraw:drawings:v1", JSON.stringify(data.drawings))
        const updatedTree = await repository.getDrawingsTree()
        onTreeUpdated(updatedTree)
        onCloseMenu()
        onResetActiveDrawing()
      } catch (err) {
        console.error("Import failed:", err)
        onError("Failed to import project. Check file format.")
      }
    }
    input.click()
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        marginTop: "0.25rem",
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: "6px",
        boxShadow: colors.shadowIsland,
        minWidth: "160px",
        zIndex: 10000,
        padding: "0.25rem",
      }}
    >
      <button
        type="button"
        onClick={() => {
          onToggleSearch()
          onCloseMenu()
        }}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "0.4rem 0.6rem",
          fontSize: "0.8125rem",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: colors.text,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          borderRadius: "4px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.hoverBackground
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        <Icon name="search" size={14} aria-label="Search" />
        Search (Cmd+K)
      </button>

      <button
        type="button"
        onClick={() => {
          onToggleGraph()
          onCloseMenu()
        }}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "0.4rem 0.6rem",
          fontSize: "0.8125rem",
          border: "none",
          background: isGraphView ? colors.activeBackground : "transparent",
          cursor: "pointer",
          color: colors.text,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          borderRadius: "4px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.hoverBackground
        }}
        onMouseLeave={(e) => {
          if (!isGraphView) {
            e.currentTarget.style.backgroundColor = "transparent"
          }
        }}
      >
        <svg
          width="14"
          height="14"
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
        Graph view (Cmd+G)
      </button>

      <div style={{ height: "1px", backgroundColor: colors.border, margin: "0.25rem 0" }} />

      <button
        type="button"
        onClick={handleExport}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "0.4rem 0.6rem",
          fontSize: "0.8125rem",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: colors.text,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          borderRadius: "4px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.hoverBackground
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        <Icon name="download" size={14} aria-label="Export" />
        Export project
      </button>

      <button
        type="button"
        onClick={handleImport}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "0.4rem 0.6rem",
          fontSize: "0.8125rem",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: colors.text,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          borderRadius: "4px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.hoverBackground
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        <Icon name="upload" size={14} aria-label="Import" />
        Import project
      </button>

      <div style={{ height: "1px", backgroundColor: colors.border, margin: "0.25rem 0" }} />

      <button
        type="button"
        onClick={() => {
          const { theme: currentTheme, setTheme } = useThemeStore.getState()
          setTheme(currentTheme === "light" ? "dark" : "light")
          onCloseMenu()
        }}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "0.4rem 0.6rem",
          fontSize: "0.8125rem",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: colors.text,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          borderRadius: "4px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.hoverBackground
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        <Icon name="sun" size={14} aria-label="Theme" />
        Toggle theme
      </button>
    </div>
  )
}
