import type { Drawing } from "@/shared/types/drawing"

export function validateNoCircularReference(
  drawingId: string,
  parentId: string | null,
  drawingMap: Map<string, Drawing>
): void {
  if (drawingId === parentId) {
    throw new Error("A drawing cannot be its own parent")
  }

  if (!parentId) return

  const parentExists = drawingMap.has(parentId)
  if (!parentExists) {
    throw new Error(`Parent drawing ${parentId} not found`)
  }

  let currentParentId: string | null = parentId
  const visited = new Set<string>([drawingId])

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      throw new Error("This would create a circular reference")
    }
    visited.add(currentParentId)

    const parent = drawingMap.get(currentParentId)
    if (!parent) break
    currentParentId = parent.parent_id
  }
}
