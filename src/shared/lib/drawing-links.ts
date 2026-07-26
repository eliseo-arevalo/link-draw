/**
 * Utility functions for handling links between Excalidraw drawings
 */

export const DRAWING_LINK_PREFIX = "drawing://"
const ID_PREVIEW_LENGTH = 8

/**
 * Minimal interface for Excalidraw elements with links
 */
export interface ExcalidrawElementWithLink {
  id: string
  link?: string | null
}

/**
 * Information about a drawing link found in an element
 */
export interface DrawingLinkInfo {
  elementId: string
  drawingId: string
  targetType: "drawing" | "element" | "frame"
  link: string
}

export type LinkTarget =
  | { type: "drawing"; drawingId: string }
  | { type: "element"; drawingId: string; elementId: string }
  | { type: "frame"; drawingId: string; frameId: string }

/**
 * Creates a link URL for a drawing
 */
export function createDrawingLink(drawingId: string): string {
  return `${DRAWING_LINK_PREFIX}${drawingId}`
}

/**
 * Creates a link URL for a specific element in a drawing
 */
export function createElementLink(drawingId: string, elementId: string): string {
  return `${DRAWING_LINK_PREFIX}${drawingId}#element:${elementId}`
}

/**
 * Creates a link URL for a frame in a drawing
 */
export function createFrameLink(drawingId: string, frameId: string): string {
  return `${DRAWING_LINK_PREFIX}${drawingId}#frame:${frameId}`
}

/**
 * Checks if a link is a drawing link (supports current drawing:// and legacy excaligraph://drawing/)
 */
export function isDrawingLink(link: string | null | undefined): boolean {
  if (!link) return false
  return link.startsWith(DRAWING_LINK_PREFIX) || link.startsWith("excaligraph://drawing/")
}

/**
 * Parses a drawing link into its components
 */
export function parseDrawingLink(link: string): LinkTarget | null {
  if (!link) return null

  // Handle legacy scheme for backward compatibility
  let normalizedLink = link
  if (normalizedLink.startsWith("excaligraph://drawing/")) {
    normalizedLink = normalizedLink.replace("excaligraph://drawing/", DRAWING_LINK_PREFIX)
  }

  if (!normalizedLink.startsWith(DRAWING_LINK_PREFIX)) {
    return null
  }

  const [base, fragment] = normalizedLink.split("#")
  const drawingId = base.replace(DRAWING_LINK_PREFIX, "")

  if (!drawingId) {
    return null
  }

  if (!fragment) {
    return { type: "drawing", drawingId }
  }

  const [type, value] = fragment.split(":")

  // Validate that value exists for element/frame types
  if (!value) {
    return { type: "drawing", drawingId }
  }

  switch (type) {
    case "element":
      return { type: "element", drawingId, elementId: value }
    case "frame":
      return { type: "frame", drawingId, frameId: value }
    default:
      return { type: "drawing", drawingId }
  }
}

export function extractDrawingIdFromLink(link: string): string | null {
  const parsed = parseDrawingLink(link)
  return parsed?.drawingId ?? null
}

/**
 * Converts a drawing link to a navigation URL
 */
export function drawingLinkToUrl(link: string): string {
  const drawingId = extractDrawingIdFromLink(link)
  if (!drawingId) {
    return "#"
  }
  return `/editor?id=${drawingId}`
}

/**
 * Finds all drawing links in Excalidraw elements
 */
export function findDrawingLinks(
  elements: readonly ExcalidrawElementWithLink[]
): DrawingLinkInfo[] {
  const links: DrawingLinkInfo[] = []

  for (const element of elements) {
    if (element.link && isDrawingLink(element.link)) {
      const parsed = parseDrawingLink(element.link)
      if (parsed) {
        links.push({
          elementId: element.id,
          drawingId: parsed.drawingId,
          targetType: parsed.type,
          link: element.link,
        })
      }
    }
  }

  return links
}

/**
 * Truncates an ID for display purposes
 */
function truncateId(id: string): string {
  return id.length > ID_PREVIEW_LENGTH ? `${id.slice(0, ID_PREVIEW_LENGTH)}...` : id
}

/**
 * Gets a human-readable description of the link target
 */
export function getLinkDescription(link: string): string {
  const parsed = parseDrawingLink(link)
  if (!parsed) {
    return "Invalid link"
  }

  switch (parsed.type) {
    case "drawing":
      return "Navigate to drawing"
    case "element":
      return `Navigate to element ${truncateId(parsed.elementId)}`
    case "frame":
      return `Navigate to frame ${truncateId(parsed.frameId)}`
  }
}
