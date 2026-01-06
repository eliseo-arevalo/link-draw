import type { ElementDefinition } from "cytoscape"
import type { Drawing } from "@/shared/types/drawing"
import type { GraphFilters, GraphStats } from "@/shared/types/graph"
import { buildHierarchyEdges, buildLinkEdges, buildNodes } from "./graph-elements"
import { buildGraphMaps, calculateMaxDepth } from "./graph-utils"
import { extractLinks } from "./link-extractor"

export function buildGraphElements(
  drawings: Drawing[],
  filters: GraphFilters
): { elements: ElementDefinition[]; stats: GraphStats } {
  // Build maps
  const maps = buildGraphMaps(drawings, extractLinks)

  // Build nodes
  const { elements, nodeIds, orphanCount } = buildNodes(drawings, filters, maps)

  // Build edges
  if (filters.showHierarchy) {
    elements.push(...buildHierarchyEdges(drawings, nodeIds))
  }

  if (filters.showLinks) {
    elements.push(...buildLinkEdges(drawings, nodeIds, extractLinks))
  }

  // Calculate stats
  const edgeCount = elements.filter((el) => el.data.source).length
  const maxDepth = calculateMaxDepth(nodeIds, maps.parentMap)

  const stats: GraphStats = {
    nodes: nodeIds.size,
    edges: edgeCount,
    orphans: orphanCount,
    maxDepth,
  }

  return { elements, stats }
}
