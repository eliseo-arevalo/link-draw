import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  isDanger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)

  if (!isOpen) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20000,
        padding: "1rem",
      }}
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel()
      }}
    >
      <div
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          boxShadow: colors.shadowIsland,
          padding: "1.25rem",
          maxWidth: "400px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 600,
              color: colors.text,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: colors.textSecondary,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {description}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            marginTop: "0.5rem",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.8125rem",
              borderRadius: "4px",
              border: `1px solid ${colors.border}`,
              backgroundColor: "transparent",
              color: colors.text,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.8125rem",
              borderRadius: "4px",
              border: "none",
              backgroundColor: isDanger ? "#ef4444" : colors.accent,
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
