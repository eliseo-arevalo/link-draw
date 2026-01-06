import { Icon } from "@/shared/components/Icon"

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
            <Icon name="arrowLeft" size={20} className="text-gray-600" aria-label="Back" />
          </button>
        )}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
    </div>
  )
}
