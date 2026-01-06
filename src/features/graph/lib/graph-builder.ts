import type { ElementDefinition } from "cytoscape"
import type { Drawing } from "@/shared/types/drawing"
import { extractLinks } from "./link-extractor"

interface GraphFilters {
  showHierarchy: boolean
  showLinks: boolean
  showOrphans: boolean
}

interface GraphStats {
  nodes: number
  edges: number
  orphans: number
  maxDepth: number
}

export function buildGraphElements(
  drawings: Drawing[],
  filters: GraphFilters
): { elements: ElementDefinition[]; stats: GraphStats } {
  const elements: ElementDefinition[] = []
  const nodeIds = new Set<string>()
  const parentMap = new Map<string, string>()
  const childrenMap = new Map<string, Set<string>>()
  const linkMap = new Map<string, Set<string>>()

  // Build maps
  for (const drawing of drawings) {
    if (drawing.parent_id) {
      parentMap.set(drawing.id, drawing.parent_id)
      if (!childrenMap.has(drawing.parent_id)) {
        childrenMap.set(drawing.parent_id, new Set())
      }
      const children = childrenMap.get(drawing.parent_id)
      if (children) {
        children.add(drawing.id)
      }
    }
    const links = extractLinks(drawing)
    if (links.length > 0) {
      linkMap.set(drawing.id, new Set(links))
    }
  }

  // Calculate node colors
  const getNodeColor = (drawing: Drawing): string => {
    const isRoot = !drawing.parent_id
    const hasChildren = childrenMap.has(drawing.id)
    const hasLinks = linkMap.has(drawing.id)

    if (isRoot && hasChildren) return "#8b5cf6" // Purple - Root with children
    if (hasLinks) return "#3b82f6" // Blue - Has links
    if (hasChildren) return "#10b981" // Green - Has children
    if (isRoot) return "#6b7280" // Gray - Orphan
    return "#6366f1" // Default indigo
  }

  // Add nodes
  let orphanCount = 0
  for (const drawing of drawings) {
    const isOrphan = !drawing.parent_id
    if (!filters.showOrphans && isOrphan) continue

    if (isOrphan) orphanCount++
    elements.push({
      data: {
        id: drawing.id,
        label: drawing.title,
        color: getNodeColor(drawing),
      },
    })
    nodeIds.add(drawing.id)
  }

  // Add hierarchy edges
  let edgeCount = 0
  if (filters.showHierarchy) {
    for (const drawing of drawings) {
      if (drawing.parent_id && nodeIds.has(drawing.parent_id) && nodeIds.has(drawing.id)) {
        elements.push({
          data: {
            id: `h-${drawing.parent_id}-${drawing.id}`,
            source: drawing.parent_id,
            target: drawing.id,
            type: "hierarchy",
          },
        })
        edgeCount++
      }
    }
  }

  // Add link edges
  if (filters.showLinks) {
    for (const drawing of drawings) {
      if (!nodeIds.has(drawing.id)) continue
      const links = extractLinks(drawing)
      for (const targetId of links) {
        if (nodeIds.has(targetId)) {
          elements.push({
            data: {
              id: `l-${drawing.id}-${targetId}`,
              source: drawing.id,
              target: targetId,
              type: "link",
            },
          })
          edgeCount++
        }
      }
    }
  }

  // Calculate max depth
  const getDepth = (id: string, visited = new Set<string>()): number => {
    if (visited.has(id)) return 0
    visited.add(id)
    const parent = parentMap.get(id)
    return parent && nodeIds.has(parent) ? 1 + getDepth(parent, visited) : 0
  }

  const maxDepth =
    nodeIds.size > 0 ? Math.max(0, ...Array.from(nodeIds).map((id) => getDepth(id))) : 0

  const stats: GraphStats = {
    nodes: nodeIds.size,
    edges: edgeCount,
    orphans: orphanCount,
    maxDepth,
  }

  return { elements, stats }
}
