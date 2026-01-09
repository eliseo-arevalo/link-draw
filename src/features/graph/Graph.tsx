import cytoscape, { type Core } from "cytoscape"
import { useCallback, useEffect, useRef, useState } from "react"
import { Icon } from "@/shared/components/Icon"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useThemeStore } from "@/shared/store/themeStore"
import { useTreeStore } from "@/shared/store/treeStore"
import { useViewStore } from "@/shared/store/viewStore"
import { getThemeColors } from "@/shared/styles/theme"
import type { Drawing } from "@/shared/types/drawing"
import type { GraphStats } from "@/shared/types/graph"
import { GraphHeader } from "./components/GraphHeader"
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
  const layoutRef = useRef<ReturnType<Core["layout"]> | null>(null)
  const { setActiveDrawingId } = useDrawingStore()
  const { setViewMode } = useViewStore()
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)
  const [layout, setLayout] = useState<LayoutType>("cose")
  const [_refreshTrigger, setRefreshTrigger] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [stats, setStats] = useState<GraphStats>({
    nodes: 0,
    edges: 0,
    orphans: 0,
    maxDepth: 0,
  })

  const getGraphStyles = useCallback(
    (currentTheme: "light" | "dark") => [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "background-color": "data(color)",
          color: currentTheme === "dark" ? "#e5e7eb" : "#1f2937",
          "text-valign": "center" as const,
          "text-halign": "center" as const,
          width: "80px",
          height: "80px",
          "font-size": "14px",
          "text-wrap": "wrap" as const,
          "text-max-width": "70px",
        },
      },
      {
        selector: "node.dimmed",
        style: {
          opacity: 0.3,
        },
      },
      {
        selector: "node:selected",
        style: {
          "background-color": "#6366f1",
          "border-width": 3,
          "border-color": currentTheme === "dark" ? "#818cf8" : "#4338ca",
        },
      },
      {
        selector: "edge[type='hierarchy']",
        style: {
          width: 3,
          "line-color": currentTheme === "dark" ? "#6b7280" : "#9ca3af",
          "target-arrow-color": currentTheme === "dark" ? "#6b7280" : "#9ca3af",
          "target-arrow-shape": "triangle" as const,
          "curve-style": "bezier" as const,
        },
      },
      {
        selector: "edge[type='link']",
        style: {
          width: 2,
          "line-color": currentTheme === "dark" ? "#60a5fa" : "#3b82f6",
          "target-arrow-color": currentTheme === "dark" ? "#60a5fa" : "#3b82f6",
          "target-arrow-shape": "triangle" as const,
          "curve-style": "bezier" as const,
          "line-style": "dashed" as const,
        },
      },
    ],
    []
  )

  // Helper to create tooltip element
  const createTooltip = useCallback(
    (drawing: Drawing, childCount: number, linkCount: number, x: number, y: number) => {
      const tooltip = document.createElement("div")
      tooltip.id = "graph-tooltip"
      tooltip.style.cssText = `
        position: fixed;
        background: ${theme === "dark" ? "#1f2937" : "#ffffff"};
        color: ${theme === "dark" ? "#e5e7eb" : "#1f2937"};
        border: 1px solid ${theme === "dark" ? "#374151" : "#d1d5db"};
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 13px;
        z-index: 999999;
        pointer-events: none;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        max-width: 200px;
      `
      tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${drawing.title}</div>
        <div style="font-size: 12px; opacity: 0.8;">
          ${childCount} children • ${linkCount} links
        </div>
      `
      tooltip.style.left = `${x}px`
      tooltip.style.top = `${y}px`
      document.body.appendChild(tooltip)
    },
    [theme]
  )

  useEffect(() => {
    if (!containerRef.current) return

    const loadGraph = async () => {
      const drawings = await repository.listDrawings()
      const filters = { showHierarchy: true, showLinks: true, showOrphans: true }
      const { elements, stats: graphStats } = buildGraphElements(drawings, filters)
      setStats(graphStats)

      // Only create if doesn't exist
      if (cyRef.current) {
        return
      }

      // Create new graph
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: getGraphStyles(theme),
      })

      // Run layout and store reference to stop it on cleanup
      layoutRef.current = cyRef.current.layout(LAYOUTS[layout].config)
      layoutRef.current.run()

      cyRef.current.on("tap", "node", (evt) => {
        const nodeId = evt.target.id()
        const existingTooltip = document.getElementById("graph-tooltip")
        if (existingTooltip) {
          existingTooltip.remove()
        }
        setActiveDrawingId(nodeId)
        setViewMode("canvas")
      })

      // Add tooltip on hover
      let tooltipTimeout: number | null = null
      cyRef.current.on("mouseover", "node", (evt) => {
        const node = evt.target
        const nodeId = node.id()
        const drawing = drawings.find((d) => d.id === nodeId)
        if (!drawing) return

        // Clear any existing timeout
        if (tooltipTimeout) clearTimeout(tooltipTimeout)

        // Show tooltip after short delay
        tooltipTimeout = setTimeout(() => {
          const childCount = drawings.filter((d) => d.parent_id === nodeId).length
          const linkCount =
            drawing.content?.elements?.filter((el: { link?: string }) =>
              el.link?.startsWith("drawing://")
            ).length || 0

          const renderedPosition = node.renderedPosition()
          const containerRect = containerRef.current?.getBoundingClientRect()
          if (containerRect) {
            createTooltip(
              drawing,
              childCount,
              linkCount,
              containerRect.left + renderedPosition.x + 15,
              containerRect.top + renderedPosition.y - 10
            )
          }
        }, 300)
      })

      cyRef.current.on("mouseout", "node", () => {
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout)
          tooltipTimeout = null
        }
        const existingTooltip = document.getElementById("graph-tooltip")
        if (existingTooltip) {
          existingTooltip.remove()
        }
      })
    }

    loadGraph()

    return () => {
      // Stop layout if running
      if (layoutRef.current) {
        layoutRef.current.stop()
        layoutRef.current = null
      }
      // Destroy graph
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [layout, repository, theme, getGraphStyles, createTooltip, setActiveDrawingId, setViewMode])

  // Auto-refresh when tree changes (separate effect to avoid lint warnings)
  const { tree } = useTreeStore()
  const prevTreeRef = useRef<string>("")

  useEffect(() => {
    // Serialize tree to detect any change (not just length)
    const treeSnapshot = JSON.stringify(tree)

    // Skip first render
    if (prevTreeRef.current === "") {
      prevTreeRef.current = treeSnapshot
      return
    }

    // If tree changed, trigger refresh
    if (prevTreeRef.current !== treeSnapshot) {
      prevTreeRef.current = treeSnapshot
      setRefreshTrigger((prev) => prev + 1)
    }
  }, [tree])

  // Handle container resize (e.g., when sidebar collapses)
  useEffect(() => {
    if (!containerRef.current || !cyRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      // Force immediate resize without debouncing
      if (cyRef.current) {
        cyRef.current.resize()
        // Force a second resize on next tick to catch any lag
        setTimeout(() => cyRef.current?.resize(), 0)
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!cyRef.current || !query.trim()) {
      // Reset all nodes to normal
      cyRef.current?.nodes().removeClass("dimmed")
      return
    }

    const lowerQuery = query.toLowerCase()
    cyRef.current.nodes().forEach((node) => {
      const label = node.data("label")?.toLowerCase() || ""
      if (label.includes(lowerQuery)) {
        node.removeClass("dimmed")
        // Center on first match
        const dimmedCount = cyRef.current?.nodes(".dimmed").length || 0
        const totalCount = cyRef.current?.nodes().length || 0
        if (dimmedCount === totalCount - 1) {
          cyRef.current?.animate(
            {
              center: { eles: node },
              zoom: 1.5,
            },
            {
              duration: 500,
            }
          )
        }
      } else {
        node.addClass("dimmed")
      }
    })
  }

  const handleLayoutChange = (newLayout: LayoutType) => {
    setLayout(newLayout)
    // Layout will be applied by useEffect
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.backgroundSecondary }}>
      {/* Header with Controls */}
      <GraphHeader
        theme={theme}
        layout={layout}
        searchQuery={searchQuery}
        stats={stats}
        layouts={LAYOUTS}
        onLayoutChange={handleLayoutChange}
        onSearchChange={handleSearch}
        onRefresh={handleRefresh}
      />

      {/* Graph Container */}
      <div style={{ position: "relative", flex: 1, backgroundColor: colors.background }}>
        <div
          ref={containerRef}
          style={{ width: "100%", height: "100%", backgroundColor: colors.background }}
        />
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
