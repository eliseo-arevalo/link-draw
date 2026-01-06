import type { ElementDefinition } from "cytoscape"
import type { Drawing } from "@/shared/types/drawing"
import type { GraphFilters } from "@/shared/types/graph"
import type { GraphMaps } from "./graph-utils"
import { getNodeColor } from "./graph-utils"

export function buildNodes(
  drawings: Drawing[],
  filters: GraphFilters,
  maps: GraphMaps
): { elements: ElementDefinition[]; nodeIds: Set<string>; orphanCount: number } {
  const elements: ElementDefinition[] = []
  const nodeIds = new Set<string>()
  let orphanCount = 0

  for (const drawing of drawings) {
    const isOrphan = !drawing.parent_id
    if (!filters.showOrphans && isOrphan) continue

    if (isOrphan) orphanCount++
    elements.push({
      data: {
        id: drawing.id,
        label: drawing.title,
        color: getNodeColor(drawing, maps.childrenMap, maps.linkMap),
      },
    })
    nodeIds.add(drawing.id)
  }

  return { elements, nodeIds, orphanCount }
}

export function buildHierarchyEdges(
  drawings: Drawing[],
  nodeIds: Set<string>
): ElementDefinition[] {
  const edges: ElementDefinition[] = []

  for (const drawing of drawings) {
    if (drawing.parent_id && nodeIds.has(drawing.parent_id) && nodeIds.has(drawing.id)) {
      edges.push({
        data: {
          id: `h-${drawing.parent_id}-${drawing.id}`,
          source: drawing.parent_id,
          target: drawing.id,
          type: "hierarchy",
        },
      })
    }
  }

  return edges
}

export function buildLinkEdges(
  drawings: Drawing[],
  nodeIds: Set<string>,
  extractLinks: (drawing: Drawing) => string[]
): ElementDefinition[] {
  const edges: ElementDefinition[] = []

  for (const drawing of drawings) {
    if (!nodeIds.has(drawing.id)) continue
    const links = extractLinks(drawing)
    for (const targetId of links) {
      if (nodeIds.has(targetId)) {
        edges.push({
          data: {
            id: `l-${drawing.id}-${targetId}`,
            source: drawing.id,
            target: targetId,
            type: "link",
          },
        })
      }
    }
  }

  return edges
}
