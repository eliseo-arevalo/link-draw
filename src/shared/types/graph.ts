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
 * Graph statistics
 */
export interface GraphStats {
  totalNodes: number
  totalEdges: number
  semanticEdges: number
  hierarchyEdges: number
  orphanNodes: number
  maxDepth: number
  mostConnectedNodes: Array<{
    id: string
    label: string
    connections: number
  }>
  clusters: Array<{
    nodes: string[]
    size: number
  }>
}

/**
 * Graph filters
 */
export interface GraphFilters {
  showSemanticLinks: boolean
  showHierarchyLinks: boolean
  maxDepth?: number
  showOrphans: boolean
  searchQuery?: string
}
