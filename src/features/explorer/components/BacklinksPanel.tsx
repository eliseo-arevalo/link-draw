import { useEffect, useState } from "react"
import { Icon } from "@/shared/components/Icon"
import { useServices } from "@/shared/providers/ServiceProvider"
import type { getThemeColors } from "@/shared/styles/theme"
import type { BacklinkInfo } from "@/shared/types/drawing"

interface BacklinksPanelProps {
  activeDrawingId: string | null
  colors: ReturnType<typeof getThemeColors>
  onSelectDrawing: (id: string, elementId?: string) => void
}

export function BacklinksPanel({ activeDrawingId, colors, onSelectDrawing }: BacklinksPanelProps) {
  const { linkService } = useServices()
  const [backlinks, setBacklinks] = useState<BacklinkInfo[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let isCancelled = false
    if (!activeDrawingId) {
      setBacklinks([])
      return
    }

    setIsLoading(true)
    linkService
      .getBacklinks(activeDrawingId)
      .then((links) => {
        if (!isCancelled) {
          setBacklinks(links)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.error("[BacklinksPanel] Failed to fetch backlinks:", err)
        if (!isCancelled) {
          setBacklinks([])
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [activeDrawingId, linkService])

  if (!activeDrawingId) {
    return null
  }

  return (
    <div
      style={{
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.background,
        transition: "height 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        height: isExpanded ? "180px" : "34px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Header Bar at bottom of sidebar */}
      <div
        style={{
          height: "34px",
          minHeight: "34px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 0.75rem",
          cursor: "pointer",
          userSelect: "none",
          backgroundColor: colors.background,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        title={isExpanded ? "Collapse Backlinks" : "Expand Backlinks"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Icon name="backlink" size={13} color={colors.accent} />
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: colors.text,
              letterSpacing: "0.03em",
            }}
          >
            BACKLINKS
          </span>
          <span
            style={{
              fontSize: "0.68rem",
              padding: "0.05rem 0.4rem",
              borderRadius: "10px",
              backgroundColor: colors.badgeBg,
              color: colors.textSecondary,
              fontWeight: 600,
            }}
          >
            {isLoading ? "..." : backlinks.length}
          </span>
        </div>

        <Icon
          name={isExpanded ? "chevronDown" : "chevronRight"}
          size={12}
          color={colors.textSecondary}
        />
      </div>

      {/* Expanded Content inside Sidebar */}
      {isExpanded && (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.25rem 0.5rem 0.5rem 0.5rem",
            borderTop: `1px solid ${colors.border}`,
            scrollbarWidth: "thin",
          }}
        >
          {backlinks.length === 0 ? (
            <p
              style={{
                fontSize: "0.75rem",
                color: colors.textSecondary,
                fontStyle: "italic",
                margin: 0,
                padding: "0.5rem 0.25rem",
              }}
            >
              No drawings link to this canvas
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {backlinks.map((link, idx) => (
                <button
                  key={`${link.sourceDrawingId}-${link.elementId}-${idx}`}
                  type="button"
                  onClick={() => onSelectDrawing(link.sourceDrawingId, link.elementId)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "4px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    color: colors.text,
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.hoverBackground
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }}
                >
                  <Icon name="file" size={13} color={colors.iconColor} />
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {link.sourceDrawingTitle}
                  </span>
                  <Icon name="link" size={11} color={colors.textSecondary} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
