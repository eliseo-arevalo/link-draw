import type { DrawingTreeNode } from "@/shared/types/drawing"

/**
 * Generate a unique drawing name to avoid conflicts
 * Strategy: "Drawing - MMM DD, HH:MM AM/PM"
 */
export function generateUniqueDrawingName(existingTree: DrawingTreeNode[]): string {
  const now = new Date()

  // Format: "Drawing - Jan 14, 9:27 PM"
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const timestamp = formatter.format(now)
  const baseName = `Drawing - ${timestamp}`

  // Check if name exists (unlikely with timestamp, but just in case)
  if (!nameExists(baseName, existingTree)) {
    return baseName
  }

  // Fallback: append counter
  let counter = 2
  while (nameExists(`${baseName} (${counter})`, existingTree)) {
    counter++
  }

  return `${baseName} (${counter})`
}

/**
 * Check if a drawing name already exists in the tree
 */
function nameExists(name: string, nodes: DrawingTreeNode[]): boolean {
  for (const node of nodes) {
    if (node.title === name) {
      return true
    }
    if (node.children && nameExists(name, node.children)) {
      return true
    }
  }
  return false
}
