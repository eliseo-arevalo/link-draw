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

export function ElementList({ elements, onSelectElement, onSelectWholeDrawing }: ElementListProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* Opción principal: Link al dibujo completo */}
      <button
        type="button"
        onClick={onSelectWholeDrawing}
        className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-500 rounded-lg hover:bg-blue-100 transition-colors text-left w-full mb-3"
      >
        <Icon name="file" size={24} className="text-blue-500 flex-shrink-0" aria-label="Drawing" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-blue-700">Link to entire drawing</div>
          <div className="text-xs text-blue-600 mt-0.5">Navigate to this drawing when clicked</div>
        </div>
      </button>

      {elements.length > 0 && (
        <>
          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500 font-medium">OR LINK TO SPECIFIC ELEMENT</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="text-xs text-gray-500 mb-2 px-1">
            {elements.length} element{elements.length !== 1 ? "s" : ""} available
          </div>

          {elements.map((element) => (
            <button
              key={element.id}
              type="button"
              onClick={() => onSelectElement(element.id)}
              className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 transition-colors text-left w-full"
            >
              <span className="text-xs font-mono px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 uppercase flex-shrink-0">
                {getElementIcon(element.type)}
              </span>
              <span className="flex-1 text-sm text-gray-900 truncate">
                {getElementLabel(element)}
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}
