import { Icon } from "@/shared/components/Icon"

interface ElementInfo {
  id: string
  type: string
  text?: string
  name?: string
}

interface ElementListProps {
  elements: ElementInfo[]
  onSelectElement: (elementId: string) => void
  onSelectWholeDrawing: () => void
  textColor: string
  textSecondaryColor: string
  hoverBg: string
  borderColor: string
}

const getElementLabel = (element: ElementInfo) => {
  if (element.type === "text" && element.text) {
    const truncated = element.text.length > 30 ? `${element.text.slice(0, 30)}...` : element.text
    return truncated
  }

  if (element.type === "frame" && element.name) {
    return element.name
  }

  return `${element.type} (${element.id.slice(0, 8)})`
}

export function ElementList({
  elements,
  onSelectElement,
  onSelectWholeDrawing,
  textColor,
  textSecondaryColor,
  hoverBg,
  borderColor,
}: ElementListProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* Opción principal: Link al dibujo completo */}
      <button
        type="button"
        onClick={onSelectWholeDrawing}
        className="flex items-center gap-3 p-3.5 rounded-lg transition-colors text-left w-full mb-3"
        style={{
          backgroundColor: hoverBg,
          border: `1px solid ${borderColor}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--color-accent, #4f46e5)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = borderColor
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            backgroundColor: "rgba(79, 70, 229, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="file" size={18} color="#4f46e5" aria-label="Drawing" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: textColor }}>
            Link to entire drawing
          </div>
          <div className="text-xs mt-0.5" style={{ color: textSecondaryColor }}>
            Navigate to this drawing when clicked
          </div>
        </div>
      </button>

      {elements.length > 0 && (
        <>
          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px" style={{ backgroundColor: borderColor }} />
            <span
              className="text-xs font-semibold uppercase"
              style={{ color: textSecondaryColor, letterSpacing: "0.05em" }}
            >
              Or link to specific element
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: borderColor }} />
          </div>

          <div className="text-xs mb-2 px-1 font-medium" style={{ color: textSecondaryColor }}>
            {elements.length} element{elements.length !== 1 ? "s" : ""} available
          </div>

          {elements.map((element) => (
            <button
              key={element.id}
              type="button"
              onClick={() => onSelectElement(element.id)}
              className="flex items-center gap-3 p-2.5 rounded-md transition-colors text-left w-full"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = hoverBg
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
              }}
            >
              <span
                className="text-xs font-mono px-2 py-0.5 rounded uppercase flex-shrink-0 font-medium"
                style={{ backgroundColor: hoverBg, color: textSecondaryColor }}
              >
                {element.type}
              </span>
              <span className="flex-1 text-sm truncate" style={{ color: textColor }}>
                {getElementLabel(element)}
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}
