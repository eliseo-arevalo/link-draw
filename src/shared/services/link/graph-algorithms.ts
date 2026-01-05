import type { DrawingLink } from "@/shared/types/drawing"

export function buildLinkGraph(linksMap: Map<string, DrawingLink[]>): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()

  for (const [sourceId, links] of linksMap.entries()) {
    if (!graph.has(sourceId)) {
      graph.set(sourceId, new Set())
    }

    for (const link of links) {
      graph.get(sourceId)?.add(link.targetDrawingId)
    }
  }

  return graph
}

export function detectCycle(graph: Map<string, Set<string>>, start: string): string[] | null {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const path: string[] = []

  const dfs = (node: string): boolean => {
    visited.add(node)
    recursionStack.add(node)
    path.push(node)

    const neighbors = graph.get(node) || new Set()

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true
        }
      } else if (recursionStack.has(neighbor)) {
        return true
      }
    }

    recursionStack.delete(node)
    path.pop()
    return false
  }

  if (dfs(start)) {
    return path
  }

  return null
}
