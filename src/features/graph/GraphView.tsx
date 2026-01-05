import { useEffect, useRef, useState } from "react"
import cytoscape, { type Core, type ElementDefinition } from "cytoscape"
import { LocalStorageRepository } from "@/shared/repositories/localStorage/LocalStorageRepository"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useViewStore } from "@/shared/store/viewStore"
import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"
import type { Drawing } from "@/shared/types/drawing"

const repository = new LocalStorageRepository()

interface GraphFilters {
  showHierarchy: boolean
  showLinks: boolean
  showOrphans: boolean
}

interface GraphStats {
  nodes: number
  edges: number
  orphans: number
  maxDepth: number
}

export function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const { setActiveDrawingId } = useDrawingStore()
  const { setViewMode } = useViewStore()
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)
  const [filters, setFilters] = useState<GraphFilters>({
    showHierarchy: true,
    showLinks: true,
    showOrphans: true,
  })
  const [stats, setStats] = useState<GraphStats>({
    nodes: 0,
    edges: 0,
    orphans: 0,
    maxDepth: 0,
  })

  useEffect(() => {
    if (!containerRef.current) return

    const loadGraph = async () => {
      const drawings = await repository.listDrawings()
      const { elements, stats: graphStats } = buildGraphElements(drawings, filters)
      setStats(graphStats)

      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "background-color": "data(color)",
              color: "#fff",
              "text-valign": "center",
              "text-halign": "center",
              width: "80px",
              height: "80px",
              "font-size": "14px",
              "text-wrap": "wrap",
              "text-max-width": "70px",
            },
          },
          {
            selector: "node:selected",
            style: {
              "background-color": "#4f46e5",
              "border-width": 3,
              "border-color": "#312e81",
            },
          },
          {
            selector: "edge[type='hierarchy']",
            style: {
              width: 3,
              "line-color": "#94a3b8",
              "target-arrow-color": "#94a3b8",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
            },
          },
          {
            selector: "edge[type='link']",
            style: {
              width: 2,
              "line-color": "#3b82f6",
              "target-arrow-color": "#3b82f6",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              "line-style": "dashed",
            },
          },
        ],
        layout: {
          name: "cose",
          idealEdgeLength: 150,
          nodeOverlap: 20,
          refresh: 20,
          fit: true,
          padding: 50,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: 400000,
          edgeElasticity: 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
        },
      })

      cyRef.current.on("tap", "node", (evt) => {
        const nodeId = evt.target.id()
        setActiveDrawingId(nodeId)
        setViewMode("canvas")
      })
    }

    loadGraph()

    return () => {
      cyRef.current?.destroy()
    }
  }, [filters, setActiveDrawingId, setViewMode])

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.backgroundSecondary }}>
      <div
        className="p-3 border-b flex items-center gap-4"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
        }}
      >
        <span className="text-sm font-semibold" style={{ color: colors.text }}>
          Filters:
        </span>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showHierarchy}
            onChange={(e) => setFilters({ ...filters, showHierarchy: e.target.checked })}
            className="cursor-pointer"
          />
          <span style={{ color: colors.textSecondary }}>Hierarchy</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showLinks}
            onChange={(e) => setFilters({ ...filters, showLinks: e.target.checked })}
            className="cursor-pointer"
          />
          <span style={{ color: colors.textSecondary }}>Links</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showOrphans}
            onChange={(e) => setFilters({ ...filters, showOrphans: e.target.checked })}
            className="cursor-pointer"
          />
          <span style={{ color: colors.textSecondary }}>Orphans</span>
        </label>
        <div style={{ flex: 1 }} />
        <div className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
          <span>Nodes: {stats.nodes}</span>
          <span>•</span>
          <span>Edges: {stats.edges}</span>
          <span>•</span>
          <span>Orphans: {stats.orphans}</span>
          <span>•</span>
          <span>Depth: {stats.maxDepth}</span>
        </div>
      </div>
      <div style={{ position: "relative", flex: 1 }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            right: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}
            className="excalidraw-button"
            style={{
              width: "2.5rem",
              height: "2.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.background,
              boxShadow: colors.shadowIsland,
            }}
            title="Zoom in"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.2)}
            className="excalidraw-button"
            style={{
              width: "2.5rem",
              height: "2.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.background,
              boxShadow: colors.shadowIsland,
            }}
            title="Zoom out"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => cyRef.current?.fit(undefined, 50)}
            className="excalidraw-button"
            style={{
              width: "2.5rem",
              height: "2.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.background,
              boxShadow: colors.shadowIsland,
            }}
            title="Fit to screen"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function buildGraphElements(
  drawings: Drawing[],
  filters: GraphFilters
): { elements: ElementDefinition[]; stats: GraphStats } {
  const elements: ElementDefinition[] = []
  const nodeIds = new Set<string>()
  const parentMap = new Map<string, string>()
  const childrenMap = new Map<string, Set<string>>()
  const linkMap = new Map<string, Set<string>>()

  // Build maps
  for (const drawing of drawings) {
    if (drawing.parent_id) {
      parentMap.set(drawing.id, drawing.parent_id)
      if (!childrenMap.has(drawing.parent_id)) {
        childrenMap.set(drawing.parent_id, new Set())
      }
      const children = childrenMap.get(drawing.parent_id)
      if (children) {
        children.add(drawing.id)
      }
    }
    const links = extractLinks(drawing)
    if (links.length > 0) {
      linkMap.set(drawing.id, new Set(links))
    }
  }

  // Calculate node colors
  const getNodeColor = (drawing: Drawing): string => {
    const isRoot = !drawing.parent_id
    const hasChildren = childrenMap.has(drawing.id)
    const hasLinks = linkMap.has(drawing.id)

    if (isRoot && hasChildren) return "#8b5cf6" // Purple - Root with children
    if (hasLinks) return "#3b82f6" // Blue - Has links
    if (hasChildren) return "#10b981" // Green - Has children
    if (isRoot) return "#6b7280" // Gray - Orphan
    return "#6366f1" // Default indigo
  }

  // Add nodes
  let orphanCount = 0
  for (const drawing of drawings) {
    const isOrphan = !drawing.parent_id
    if (!filters.showOrphans && isOrphan) continue

    if (isOrphan) orphanCount++
    elements.push({
      data: {
        id: drawing.id,
        label: drawing.title,
        color: getNodeColor(drawing),
      },
    })
    nodeIds.add(drawing.id)
  }

  // Add hierarchy edges
  let edgeCount = 0
  if (filters.showHierarchy) {
    for (const drawing of drawings) {
      if (drawing.parent_id && nodeIds.has(drawing.parent_id) && nodeIds.has(drawing.id)) {
        elements.push({
          data: {
            id: `h-${drawing.parent_id}-${drawing.id}`,
            source: drawing.parent_id,
            target: drawing.id,
            type: "hierarchy",
          },
        })
        edgeCount++
      }
    }
  }

  // Add link edges
  if (filters.showLinks) {
    for (const drawing of drawings) {
      if (!nodeIds.has(drawing.id)) continue
      const links = extractLinks(drawing)
      for (const targetId of links) {
        if (nodeIds.has(targetId)) {
          elements.push({
            data: {
              id: `l-${drawing.id}-${targetId}`,
              source: drawing.id,
              target: targetId,
              type: "link",
            },
          })
          edgeCount++
        }
      }
    }
  }

  // Calculate max depth
  const getDepth = (id: string, visited = new Set<string>()): number => {
    if (visited.has(id)) return 0
    visited.add(id)
    const parent = parentMap.get(id)
    return parent && nodeIds.has(parent) ? 1 + getDepth(parent, visited) : 0
  }

  const maxDepth = nodeIds.size > 0 ? Math.max(0, ...Array.from(nodeIds).map((id) => getDepth(id))) : 0

  const stats: GraphStats = {
    nodes: nodeIds.size,
    edges: edgeCount,
    orphans: orphanCount,
    maxDepth,
  }

  return { elements, stats }
}

function extractLinks(drawing: Drawing): string[] {
  const links = new Set<string>()
  const elements = drawing.content.elements || []

  for (const element of elements) {
    if (element.link?.startsWith("drawing://")) {
      const match = element.link.match(/^drawing:\/\/([^#]+)/)
      if (match) {
        links.add(match[1])
      }
    }
  }

  return Array.from(links)
}
