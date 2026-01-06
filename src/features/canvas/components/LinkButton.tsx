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
      className={`
        flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${
          disabled
            ? "bg-gray-200 text-gray-500 cursor-not-allowed opacity-60"
            : "bg-blue-500 text-white hover:opacity-90 cursor-pointer"
        }
      `}
    >
      <Icon name="link" aria-label="Link to drawing" />
      Link
    </button>
  )
}
