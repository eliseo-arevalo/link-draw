import { Icon } from "@/shared/components/Icon"

interface LinkButtonProps {
  onClick: () => void
  disabled?: boolean
}

export function LinkButton({ onClick, disabled }: LinkButtonProps) {
  const title = disabled ? "Select an element to add a link" : "Link to drawing (Ctrl+L)"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.375rem",
        padding: "0.5rem 0.75rem",
        borderRadius: "0.5rem",
        fontSize: "0.875rem",
        fontWeight: 500,
        border: "none",
        transition: "opacity 0.2s",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        backgroundColor: disabled ? "#e5e7eb" : "var(--excalidraw-button-primary, #6965DB)",
        color: disabled ? "#9ca3af" : "#ffffff",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.opacity = "0.9"
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.opacity = "1"
      }}
    >
      <Icon name="link" aria-label="Link to drawing" />
      Link
    </button>
  )
}
