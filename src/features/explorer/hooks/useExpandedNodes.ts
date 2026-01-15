import { useState } from "react"

const STORAGE_KEY = "linkdraw:expanded-nodes"

/**
 * Hook to persist expanded/collapsed state of tree nodes in localStorage
 * Only for local UX - not needed in collaborative mode
 */
export function useExpandedNodes(nodeId: string, hasChildren: boolean) {
  const getExpandedNodes = (): Set<string> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  }

  const saveExpandedNodes = (expandedNodes: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedNodes]))
    } catch (err) {
      console.error("[useExpandedNodes] Failed to save:", err)
    }
  }

  // Initialize state from localStorage
  const expandedNodes = getExpandedNodes()
  const initialExpanded = hasChildren ? expandedNodes.has(nodeId) || !expandedNodes.size : false

  const [isExpanded, setIsExpandedState] = useState(initialExpanded)

  const setIsExpanded = (expanded: boolean) => {
    setIsExpandedState(expanded)

    const expandedNodes = getExpandedNodes()

    if (expanded) {
      expandedNodes.add(nodeId)
    } else {
      expandedNodes.delete(nodeId)
    }

    saveExpandedNodes(expandedNodes)
  }

  return { isExpanded, setIsExpanded }
}
