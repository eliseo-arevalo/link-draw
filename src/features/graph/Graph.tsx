import cytoscape, { type Core } from "cytoscape"
import { useEffect, useRef, useState } from "react"
import { Icon } from "@/shared/components/Icon"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useThemeStore } from "@/shared/store/themeStore"
import { useViewStore } from "@/shared/store/viewStore"
import { getThemeColors } from "@/shared/styles/theme"
import type { GraphFilters, GraphStats } from "@/shared/types/graph"
import { buildGraphElements } from "./lib/graph-builder"

type LayoutType = "cose" | "breadthfirst" | "circle" | "grid" | "concentric"

const LAYOUTS = {
  cose: {
    name: "Force-Directed",
    description: "Physics-based layout",
    config: {
      name: "cose" as const,
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
  },
  breadthfirst: {
    name: "Hierarchical",
    description: "Top-down tree layout",
    config: {
      name: "breadthfirst" as const,
      directed: true,
      padding: 50,
      spacingFactor: 1.5,
      animate: false,
    },
  },
  circle: {
    name: "Circular",
    description: "Nodes in a circle",
    config: {
      name: "circle" as const,
      padding: 50,
      animate: false,
    },
  },
  grid: {
    name: "Grid",
    description: "Organized grid",
    config: {
      name: "grid" as const,
      padding: 50,
      animate: false,
    },
  },
  concentric: {
    name: "Concentric",
    description: "Rings by depth",
    config: {
      name: "concentric" as const,
      padding: 50,
      animate: false,
      concentric: (node: { data: (key: string) => number }) => node.data("depth") || 0,
      levelWidth: () => 2,
    },
  },
}

export function Graph() {
  const { repository } = useServices()
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const { setActiveDrawingId } = useDrawingStore()
  const { setViewMode } = useViewStore()
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)
  const [layout, setLayout] = useState<LayoutType>("cose")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
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
      // Trigger update when refreshTrigger changes
      console.log("[Graph] Loading graph, trigger:", refreshTrigger)
      const drawings = await repository.listDrawings()
      const { elements, stats: graphStats } = buildGraphElements(drawings, filters)
      setStats(graphStats)

      // If graph exists, just update elements and layout
      if (cyRef.current) {
        cyRef.current.elements().remove()
        cyRef.current.add(elements)
        cyRef.current.layout(LAYOUTS[layout].config).run()
        return
      }

      // Create new graph only if it doesn't exist
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
        layout: LAYOUTS[layout].config,
      })

      cyRef.current.on("tap", "node", (evt) => {
        const nodeId = evt.target.id()
        setActiveDrawingId(nodeId)
        setViewMode("canvas")
      })
    }

    loadGraph()

    return () => {
      if (cyRef.current) {
        try {
          cyRef.current.destroy()
        } catch {
          // Ignore cleanup errors
        }
        cyRef.current = null
      }
    }
  }, [filters, layout, refreshTrigger, setActiveDrawingId, setViewMode, repository.listDrawings])

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleLayoutChange = (newLayout: LayoutType) => {
    setLayout(newLayout)
    // Apply layout to existing graph if it exists
    if (cyRef.current) {
      cyRef.current.layout(LAYOUTS[newLayout].config).run()
    }
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.backgroundSecondary }}>
      <div
        className="p-3 border-b flex items-center gap-4"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
        }}
      >
        {/* Layout Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: colors.text }}>
            Layout:
          </span>
          <select
            value={layout}
            onChange={(e) => handleLayoutChange(e.target.value as LayoutType)}
            className="text-sm px-2 py-1 rounded border cursor-pointer"
            style={{
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            }}
          >
            {(Object.keys(LAYOUTS) as LayoutType[]).map((key) => (
              <option key={key} value={key}>
                {LAYOUTS[key].name}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          className="excalidraw-button text-sm px-3 py-1"
          style={{
            backgroundColor: colors.background,
            color: colors.text,
            borderColor: colors.border,
          }}
          title="Refresh graph"
        >
          ↻ Refresh
        </button>

        <div
          style={{
            width: "1px",
            height: "1.5rem",
            backgroundColor: colors.border,
          }}
        />

        {/* Filters */}
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

        {/* Stats */}
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
            <Icon name="plus" size={20} aria-label="Zoom in" />
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
            <Icon name="minus" size={20} aria-label="Zoom out" />
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
            <Icon name="maximize" size={20} aria-label="Fit to screen" />
          </button>
        </div>
      </div>
    </div>
  )
}
