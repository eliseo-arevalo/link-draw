import { createPortal } from "react-dom"
import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"

interface DeleteConfirmDialogProps {
  isOpen: boolean
  hasChildren: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  isOpen,
  hasChildren,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)

  if (!isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 999999,
        backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)",
      }}
      onClick={onCancel}
    >
      <div
        className="rounded-lg p-6 max-w-sm shadow-xl"
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-2" style={{ color: colors.text }}>
          Delete Drawing?
        </h3>
        <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>
          This action cannot be undone.
        </p>
        {hasChildren && (
          <p className="text-sm font-medium mb-4" style={{ color: "#ef4444" }}>
            ⚠️ Warning: This drawing has children. All child drawings will also be deleted.
          </p>
        )}
        <div className="flex gap-2 justify-end mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded"
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.backgroundSecondary,
              color: colors.text,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded"
            style={{
              backgroundColor: "#ef4444",
              color: "#ffffff",
            }}
          >
            {hasChildren ? "Delete All" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
