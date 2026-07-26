/**
 * Generic tree traversal utilities
 *
 * These functions work with any tree structure that has:
 * - An `id` property
 * - An optional `children` array
 */

export interface TreeNode {
  id: string
  children?: TreeNode[]
}

/**
 * Find a node in a tree by predicate
 * @param nodes - Root nodes to search
 * @param predicate - Function to test each node
 * @returns The first node that matches, or null
 */
export function findInTree<T extends TreeNode>(
  nodes: T[],
  predicate: (node: T) => boolean
): T | null {
  for (const node of nodes) {
    if (predicate(node)) {
      return node
    }

    if (node.children) {
      const found = findInTree(node.children as T[], predicate)
      if (found) return found
    }
  }

  return null
}

/**
 * Map over all nodes in a tree
 * @param nodes - Root nodes to map
 * @param mapper - Function to transform each node
 * @returns New tree with transformed nodes
 */
export function mapTree<T extends TreeNode>(nodes: T[], mapper: (node: T) => T): T[] {
  return nodes.map((node) => {
    const mappedNode = mapper(node)

    if (node.children && node.children.length > 0) {
      return {
        ...mappedNode,
        children: mapTree(node.children as T[], mapper),
      } as T
    }

    return mappedNode
  })
}

/**
 * Filter nodes in a tree
 * @param nodes - Root nodes to filter
 * @param predicate - Function to test each node
 * @returns New tree with only matching nodes
 */
export function filterTree<T extends TreeNode>(nodes: T[], predicate: (node: T) => boolean): T[] {
  const result: T[] = []
  for (const node of nodes) {
    if (predicate(node)) {
      if (node.children && node.children.length > 0) {
        result.push({
          ...node,
          children: filterTree(node.children as T[], predicate),
        } as T)
      } else {
        result.push(node)
      }
    }
  }
  return result
}

/**
 * Check if a node has children
 * @param node - Node to check
 * @returns True if node has children
 */
export function hasChildren<T extends TreeNode>(node: T): boolean {
  return Boolean(node.children?.length)
}

/**
 * Get the path from root to a specific node
 * @param nodes - Root nodes to search
 * @param targetId - ID of the target node
 * @returns Array of IDs from root to target, or empty array if not found
 */
export function getPathToNode<T extends TreeNode>(nodes: T[], targetId: string): string[] {
  const path: string[] = []

  const findPath = (currentNodes: T[]): boolean => {
    for (const node of currentNodes) {
      path.push(node.id)

      if (node.id === targetId) {
        return true
      }

      if (node.children && findPath(node.children as T[])) {
        return true
      }

      path.pop() // Backtrack
    }

    return false
  }

  findPath(nodes)
  return path
}

/**
 * Check if a node exists in the tree
 * @param nodes - Root nodes to search
 * @param nodeId - ID to search for
 * @returns True if node exists
 */
export function nodeExists<T extends TreeNode>(nodes: T[], nodeId: string): boolean {
  return findInTree(nodes, (node) => node.id === nodeId) !== null
}

/**
 * Get all leaf nodes (nodes without children)
 * @param nodes - Root nodes to search
 * @returns Array of leaf nodes
 */
export function getLeafNodes<T extends TreeNode>(nodes: T[]): T[] {
  const leaves: T[] = []

  const collectLeaves = (currentNodes: T[]): void => {
    for (const node of currentNodes) {
      if (!hasChildren(node)) {
        leaves.push(node)
      } else if (node.children) {
        collectLeaves(node.children as T[])
      }
    }
  }

  collectLeaves(nodes)
  return leaves
}

/**
 * Get the depth of a tree
 * @param nodes - Root nodes
 * @returns Maximum depth of the tree
 */
export function getTreeDepth<T extends TreeNode>(nodes: T[]): number {
  if (nodes.length === 0) return 0

  let maxDepth = 1

  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      const childDepth = getTreeDepth(node.children as T[])
      maxDepth = Math.max(maxDepth, 1 + childDepth)
    }
  }

  return maxDepth
}

/**
 * Count total nodes in a tree
 * @param nodes - Root nodes
 * @returns Total number of nodes
 */
export function countNodes<T extends TreeNode>(nodes: T[]): number {
  let count = nodes.length

  for (const node of nodes) {
    if (node.children) {
      count += countNodes(node.children as T[])
    }
  }

  return count
}
