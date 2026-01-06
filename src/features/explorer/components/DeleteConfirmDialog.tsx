import { createPortal } from "react-dom"

interface DeleteConfirmDialogProps {
  isOpen: boolean
  hasChildren: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({ isOpen, hasChildren, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  if (!isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      style={{ zIndex: 999999 }}
      onClick={onCancel}
    >
      <div
        className="bg-white border border-gray-200 rounded-lg p-6 max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-2">Delete Drawing?</h3>
        <p className="text-sm text-gray-600 mb-2">This action cannot be undone.</p>
        {hasChildren && (
          <p className="text-sm text-red-600 font-medium mb-4">
            ⚠️ Warning: This drawing has children. All child drawings will also be deleted.
          </p>
        )}
        <div className="flex gap-2 justify-end mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            {hasChildren ? "Delete All" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
