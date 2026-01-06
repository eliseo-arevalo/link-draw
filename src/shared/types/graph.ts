/**
 * Graph data structure for visualization
 */

export interface GraphNode {
  id: string
  label: string
  level: number
  linkCount: number
  elementCount: number
  isPublic: boolean
  createdAt: string
}

export interface GraphEdge {
  source: string
  target: string
  type: "semantic" | "hierarchy"
  strength: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/**
 * Graph filters
 */
export interface GraphFilters {
  showHierarchy: boolean
  showLinks: boolean
  showOrphans: boolean
  showSemanticLinks?: boolean
  showHierarchyLinks?: boolean
  maxDepth?: number
  searchQuery?: string
}

/**
 * Simple graph statistics for current view
 */
export interface GraphStats {
  nodes: number
  edges: number
  orphans: number
  maxDepth: number
  totalNodes?: number
  totalEdges?: number
  semanticEdges?: number
  hierarchyEdges?: number
  orphanNodes?: number
  mostConnectedNodes?: Array<{
    id: string
    label: string
    connections: number
  }>
  clusters?: Array<{
    nodes: string[]
    size: number
  }>
}
