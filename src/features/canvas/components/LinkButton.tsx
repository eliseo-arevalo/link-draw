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
      className={`
        flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${disabled 
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60' 
          : 'bg-blue-500 text-white hover:opacity-90 cursor-pointer'
        }
      `}
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
        aria-hidden="true"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      Link
    </button>
  )
}
