import { useEffect, useRef } from "react"
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
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label="Confirm Deletion"
      onClose={onCancel}
      className="p-0 rounded-lg backdrop:bg-black/50 bg-transparent max-w-sm border-0"
      style={{
        zIndex: 999999,
      }}
    >
      <div
        className="rounded-lg p-6 max-w-sm shadow-xl"
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
        }}
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
            className="px-4 py-2 text-sm rounded cursor-pointer"
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
            className="px-4 py-2 text-sm rounded cursor-pointer"
            style={{
              backgroundColor: "#ef4444",
              color: "#ffffff",
            }}
          >
            {hasChildren ? "Delete All" : "Delete"}
          </button>
        </div>
      </div>
    </dialog>,
    document.body
  )
}
