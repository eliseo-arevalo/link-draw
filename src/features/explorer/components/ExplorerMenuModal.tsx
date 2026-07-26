import { useState } from "react"
import { ConfirmModal } from "@/shared/components/ConfirmModal"
import { Icon } from "@/shared/components/Icon"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
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
  onSuccess?: (msg: string) => void
}

interface PendingImport {
  text: string
  existingCount: number
  newCount: number
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
  onSuccess,
}: ExplorerMenuModalProps) {
  const { projectTransferService } = useServices()
  const { setIsImporting, setActiveDrawingId } = useDrawingStore()
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)

  const handleExport = async () => {
    try {
      const jsonString = await projectTransferService.exportProject()
      const blob = new Blob([jsonString], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `linkdraw-project-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      onCloseMenu()
    } catch (err) {
      console.error("Export failed:", err)
      onError("Failed to export project")
    }
  }

  const handleFileSelected = (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      if (!text) return

      try {
        // Validate structure first before showing confirmation modal
        const newDrawings = projectTransferService.parseAndValidateBackup(text)
        const existingDrawings = await repository.listDrawings()

        setPendingImport({
          text,
          existingCount: existingDrawings.length,
          newCount: newDrawings.length,
        })
      } catch (err) {
        console.error("Import validation failed:", err)
        const msg =
          err instanceof Error ? err.message : "Failed to import project. Check file format."
        onError(msg)
      }
    }
    reader.readAsText(file)
  }

  const handleImportClick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleFileSelected(file)
    }
    input.click()
  }

  const handleConfirmImport = async () => {
    if (!pendingImport) return

    const { text } = pendingImport
    try {
      setIsImporting(true)

      // Create safety recovery backup in sessionStorage
      await projectTransferService.createRecoveryBackup()

      onResetActiveDrawing()

      const result = await projectTransferService.importProject(text)
      const updatedTree = await repository.getDrawingsTree()

      onTreeUpdated(updatedTree)

      if (updatedTree.length > 0) {
        setActiveDrawingId(updatedTree[0].id)
      }

      onCloseMenu()
      onSuccess?.(`Imported ${result.count} drawing(s) successfully`)
    } catch (err) {
      console.error("Import failed:", err)
      const msg =
        err instanceof Error ? err.message : "Failed to import project. Check file format."
      onError(msg)
    } finally {
      setIsImporting(false)
      setPendingImport(null)
    }
  }

  return (
    <>
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
          onClick={handleImportClick}
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

      <ConfirmModal
        isOpen={!!pendingImport}
        title="Replace current project?"
        description={
          pendingImport
            ? `Importing this backup will replace all ${pendingImport.existingCount} current drawing(s) with ${pendingImport.newCount} imported drawing(s).\n\nA recovery backup will be saved automatically.`
            : ""
        }
        confirmText="Import and Replace"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={handleConfirmImport}
        onCancel={() => setPendingImport(null)}
      />
    </>
  )
}
