import { Icon } from "@/shared/components/Icon"

interface ModalHeaderProps {
  title: string
  subtitle: string
  onBack?: () => void
  textColor: string
  textSecondaryColor: string
  hoverBg: string
}

export function ModalHeader({
  title,
  subtitle,
  onBack,
  textColor,
  textSecondaryColor,
  hoverBg,
}: ModalHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded transition-colors"
            style={{ backgroundColor: "transparent" }}
            onMouseEnter={(e) => {
              const target = e.currentTarget
              target.style.backgroundColor = hoverBg
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget
              target.style.backgroundColor = "transparent"
            }}
            aria-label="Back to drawing list"
          >
            <Icon name="arrowLeft" size={20} color={textSecondaryColor} aria-label="Back" />
          </button>
        )}
        <h2 className="text-lg font-semibold" style={{ color: textColor }}>
          {title}
        </h2>
      </div>
      <p className="mt-2 text-sm" style={{ color: textSecondaryColor }}>
        {subtitle}
      </p>
    </div>
  )
}
