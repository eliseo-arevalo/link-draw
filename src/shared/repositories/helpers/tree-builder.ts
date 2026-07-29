import type { Drawing, DrawingTreeNode } from "@/shared/types/drawing"

export function buildTree(drawings: Drawing[]): DrawingTreeNode[] {
  const nodeMap = new Map<string, DrawingTreeNode>()
  const rootNodes: DrawingTreeNode[] = []

  for (const drawing of drawings) {
    const node: DrawingTreeNode = {
      ...drawing,
      children: [],
    }
    nodeMap.set(drawing.id, node)
  }

  for (const drawing of drawings) {
    const node = nodeMap.get(drawing.id)
    if (!node) continue

    if (drawing.parent_id) {
      const parent = nodeMap.get(drawing.parent_id)
      if (parent) {
        if (!parent.children) {
          parent.children = []
        }
        parent.children.push(node)
      } else {
        rootNodes.push(node)
      }
    } else {
      rootNodes.push(node)
    }
  }

  return rootNodes
}
