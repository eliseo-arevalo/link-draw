interface LinkButtonProps {
  onClick: () => void
  disabled?: boolean
}

export function LinkButton({ onClick, disabled }: LinkButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Select an element to add a link" : "Link to drawing (Ctrl+L)"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.375rem",
        padding: "0.5rem 0.75rem",
        backgroundColor: disabled ? "var(--color-gray-200)" : "var(--color-primary)",
        color: disabled ? "var(--color-gray-500)" : "white",
        border: "none",
        borderRadius: "0.5rem",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "0.875rem",
        fontWeight: 500,
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.opacity = "0.9"
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.opacity = "1"
        }
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      Link
    </button>
  )
}
