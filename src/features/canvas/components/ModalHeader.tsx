interface ModalHeaderProps {
  title: string
  subtitle: string
  onBack?: () => void
}

export function ModalHeader({ title, subtitle, onBack }: ModalHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Back to drawing list"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              className="text-gray-600"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
    </div>
  )
}
