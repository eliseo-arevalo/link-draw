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

const getElementIcon = (type: string) => {
  const icons: Record<string, string> = {
    rectangle: "rect",
    ellipse: "oval",
    arrow: "arrow",
    line: "line",
    text: "text",
    image: "image",
    frame: "frame",
  }
  return icons[type] || type.slice(0, 4)
}

const getElementLabel = (element: ElementInfo) => {
  // Si es texto, mostrar el contenido (truncado)
  if (element.type === "text" && element.text) {
    const truncated = element.text.length > 30 ? `${element.text.slice(0, 30)}...` : element.text
    return truncated
  }

  // Si es frame, mostrar el nombre
  if (element.type === "frame" && element.name) {
    return element.name
  }

  // Por defecto, mostrar tipo + ID corto
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
        className="flex items-center gap-3 p-4 rounded-lg transition-colors text-left w-full mb-3"
        style={{
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          border: "2px solid #6366f1",
        }}
      >
        <Icon name="file" size={24} color="#6366f1" aria-label="Drawing" />
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: "#6366f1" }}>
            Link to entire drawing
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#6366f1", opacity: 0.8 }}>
            Navigate to this drawing when clicked
          </div>
        </div>
      </button>

      {elements.length > 0 && (
        <>
          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px" style={{ backgroundColor: borderColor }} />
            <span className="text-xs font-medium" style={{ color: textSecondaryColor }}>
              OR LINK TO SPECIFIC ELEMENT
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: borderColor }} />
          </div>

          <div className="text-xs mb-2 px-1" style={{ color: textSecondaryColor }}>
            {elements.length} element{elements.length !== 1 ? "s" : ""} available
          </div>

          {elements.map((element) => (
            <button
              key={element.id}
              type="button"
              onClick={() => onSelectElement(element.id)}
              className="flex items-center gap-3 p-2 rounded transition-colors text-left w-full"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => {
                const target = e.currentTarget
                target.style.backgroundColor = hoverBg
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget
                target.style.backgroundColor = "transparent"
              }}
            >
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded uppercase flex-shrink-0"
                style={{ backgroundColor: hoverBg, color: textSecondaryColor }}
              >
                {getElementIcon(element.type)}
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
