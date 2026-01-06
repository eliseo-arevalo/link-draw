import type { Drawing } from "@/shared/types/drawing"

export interface GraphMaps {
  parentMap: Map<string, string>
  childrenMap: Map<string, Set<string>>
  linkMap: Map<string, Set<string>>
}

export function buildGraphMaps(drawings: Drawing[], extractLinks: (drawing: Drawing) => string[]): GraphMaps {
  const parentMap = new Map<string, string>()
  const childrenMap = new Map<string, Set<string>>()
  const linkMap = new Map<string, Set<string>>()

  for (const drawing of drawings) {
    if (drawing.parent_id) {
      parentMap.set(drawing.id, drawing.parent_id)
      if (!childrenMap.has(drawing.parent_id)) {
        childrenMap.set(drawing.parent_id, new Set())
      }
      childrenMap.get(drawing.parent_id)?.add(drawing.id)
    }
    const links = extractLinks(drawing)
    if (links.length > 0) {
      linkMap.set(drawing.id, new Set(links))
    }
  }

  return { parentMap, childrenMap, linkMap }
}

export function getNodeColor(
  drawing: Drawing,
  childrenMap: Map<string, Set<string>>,
  linkMap: Map<string, Set<string>>
): string {
  const isRoot = !drawing.parent_id
  const hasChildren = childrenMap.has(drawing.id)
  const hasLinks = linkMap.has(drawing.id)

  if (isRoot && hasChildren) return "#8b5cf6" // Purple - Root with children
  if (hasLinks) return "#3b82f6" // Blue - Has links
  if (hasChildren) return "#10b981" // Green - Has children
  if (isRoot) return "#6b7280" // Gray - Orphan
  return "#6366f1" // Default indigo
}

export function calculateMaxDepth(
  nodeIds: Set<string>,
  parentMap: Map<string, string>
): number {
  const getDepth = (id: string, visited = new Set<string>()): number => {
    if (visited.has(id)) return 0
    visited.add(id)
    const parent = parentMap.get(id)
    return parent && nodeIds.has(parent) ? 1 + getDepth(parent, visited) : 0
  }

  return nodeIds.size > 0 ? Math.max(0, ...Array.from(nodeIds).map((id) => getDepth(id))) : 0
}
