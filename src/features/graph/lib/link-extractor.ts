import type { Drawing } from "@/shared/types/drawing"

export function extractLinks(drawing: Drawing): string[] {
  const links = new Set<string>()
  const elements = drawing.content.elements || []

  for (const element of elements) {
    if (element.link?.startsWith("drawing://")) {
      const match = element.link.match(/^drawing:\/\/([^#]+)/)
      if (match) {
        links.add(match[1])
      }
    }
  }

  return Array.from(links)
}
