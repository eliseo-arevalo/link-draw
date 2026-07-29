import { useEffect, useRef, useState } from "react"
import { Icon } from "@/shared/components/Icon"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"
import type { Drawing } from "@/shared/types/drawing"

interface DrawingLinkPreviewPopoverProps {
  targetDrawingId: string | null
  position: { x: number; y: number } | null
  onClose: () => void
  onNavigate: (drawingId: string) => void
}

export function DrawingLinkPreviewPopover({
  targetDrawingId,
  position,
  onClose,
  onNavigate,
}: DrawingLinkPreviewPopoverProps) {
  const { repository } = useServices()
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)

  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const [svgHtml, setSvgHtml] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isCancelled = false
    if (!targetDrawingId) {
      setDrawing(null)
      setSvgHtml(null)
      return
    }

    setIsLoading(true)
    repository
      .loadDrawing(targetDrawingId)
      .then(async (loadedDrawing) => {
        if (isCancelled) return
        setDrawing(loadedDrawing)

        if (loadedDrawing && loadedDrawing.content?.elements?.length > 0) {
          try {
            const excalidrawMod = await import("@excalidraw/excalidraw")
            const svgElement = await excalidrawMod.exportToSvg({
              elements: loadedDrawing.content.elements,
              appState: {
                ...loadedDrawing.content.appState,
                exportWithStyle: true,
              },
              files: loadedDrawing.content.files || {},
            })

            svgElement.style.width = "100%"
            svgElement.style.height = "auto"
            svgElement.style.maxHeight = "180px"
            svgElement.style.display = "block"

            if (!isCancelled) {
              setSvgHtml(svgElement.outerHTML)
            }
          } catch (err) {
            console.error("[DrawingLinkPreviewPopover] Failed to render SVG preview:", err)
          }
        }
        if (!isCancelled) {
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.error("[DrawingLinkPreviewPopover] Failed to load target drawing:", err)
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [targetDrawingId, repository])

  if (!targetDrawingId || !position) {
    return null
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        right: "12px",
        top: "72px",
        width: "280px",
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: "8px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
        zIndex: 99999,
        padding: "0.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${colors.border}`,
          paddingBottom: "0.4rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
          <Icon name="file" size={14} color={colors.accent} />
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: colors.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {drawing ? drawing.title : "Cargando..."}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "0.2rem",
            color: colors.textSecondary,
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Icon name="x" size={14} />
        </button>
      </div>

      {/* Body: Preview */}
      <div
        style={{
          minHeight: "100px",
          maxHeight: "180px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.inputBg,
          borderRadius: "6px",
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
          padding: "0.25rem",
        }}
      >
        {isLoading ? (
          <p style={{ fontSize: "0.75rem", color: colors.textSecondary }}>
            Cargando vista previa...
          </p>
        ) : svgHtml ? (
          <div
            /* biome-ignore lint/security/noDangerouslySetInnerHtml: Trusted Excalidraw exportToSvg HTML output */
            dangerouslySetInnerHTML={{ __html: svgHtml }}
            style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center" }}
          />
        ) : (
          <p style={{ fontSize: "0.75rem", color: colors.textSecondary }}>Sin contenido visual</p>
        )}
      </div>

      {/* Footer: Open button */}
      <button
        type="button"
        onClick={() => {
          onNavigate(targetDrawingId)
          onClose()
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          padding: "0.4rem",
          backgroundColor: colors.accent,
          color: "#ffffff",
          border: "none",
          borderRadius: "6px",
          fontWeight: 500,
          fontSize: "0.8125rem",
          cursor: "pointer",
          transition: "opacity 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.9"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1"
        }}
      >
        <Icon name="link" size={13} color="#ffffff" />
        <span>Abrir Dibujo</span>
      </button>
    </div>
  )
}
