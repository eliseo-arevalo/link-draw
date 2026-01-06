import cytoscape, { type Core } from "cytoscape"
import { useEffect, useRef, useState } from "react"
import { LocalStorageRepository } from "@/shared/repositories/localStorage/LocalStorageRepository"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useThemeStore } from "@/shared/store/themeStore"
import { useViewStore } from "@/shared/store/viewStore"
import { getThemeColors } from "@/shared/styles/theme"
import { buildGraphElements } from "./lib/graph-builder"

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

export function Graph() {
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              role="img"
              aria-label="Zoom in"
            >
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              role="img"
              aria-label="Zoom out"
            >
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              role="img"
              aria-label="Fit to screen"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
