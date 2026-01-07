import cytoscape, { type Core } from "cytoscape"
import { useCallback, useEffect, useRef, useState } from "react"
import { Icon } from "@/shared/components/Icon"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useThemeStore } from "@/shared/store/themeStore"
import { useTreeStore } from "@/shared/store/treeStore"
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
  const [searchQuery, setSearchQuery] = useState("")
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

  useEffect(() => {
    if (!containerRef.current) return

    const loadGraph = async () => {
      console.log("[Graph] Loading graph, trigger:", refreshTrigger)
      const drawings = await repository.listDrawings()
      const { elements, stats: graphStats } = buildGraphElements(drawings, filters)
      setStats(graphStats)

      // If graph exists, update it instead of destroying
      if (cyRef.current) {
        // Save current positions
        const positions: Record<string, { x: number; y: number }> = {}
        cyRef.current.nodes().forEach((node) => {
          const pos = node.position()
          positions[node.id()] = { x: pos.x, y: pos.y }
        })

        // Add positions to elements before adding them
        const elementsWithPositions = elements.map((el) => {
          if (el.group === 'nodes' && el.data.id && positions[el.data.id]) {
            return { ...el, position: positions[el.data.id] }
          }
          return el
        })

        cyRef.current.elements().remove()
        cyRef.current.add(elementsWithPositions)
        cyRef.current.style(getGraphStyles(theme))

        // Position new nodes near center
        const newNodes = cyRef.current.nodes().filter((node) => !positions[node.id()])
        if (newNodes.length > 0) {
          newNodes.forEach((node, i) => {
            node.position({ x: 400 + i * 100, y: 300 })
          })
        }
        return
      }

      // Create new graph on first load
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: getGraphStyles(theme),
      })

      // Run layout only on first load
      cyRef.current.layout(LAYOUTS[layout].config).run()

      cyRef.current.on("tap", "node", (evt) => {
        const nodeId = evt.target.id()
        // Remove tooltip on click
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

          const renderedPosition = node.renderedPosition()
          const containerRect = containerRef.current?.getBoundingClientRect()
          if (containerRect) {
            tooltip.style.left = `${containerRect.left + renderedPosition.x + 15}px`
            tooltip.style.top = `${containerRect.top + renderedPosition.y - 10}px`
          }

          document.body.appendChild(tooltip)
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
      if (cyRef.current) {
        try {
          cyRef.current.destroy()
        } catch {
          // Ignore cleanup errors
        }
        cyRef.current = null
      }
    }
  }, [
    filters,
    layout,
    refreshTrigger,
    theme,
    setActiveDrawingId,
    setViewMode,
    repository.listDrawings,
    getGraphStyles,
  ])

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
      <div
        className="border-b"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
        }}
      >
        {/* Top Row: Layout, Search, Refresh */}
        <div className="px-4 py-2 flex items-center gap-3">
          {/* Layout Selector */}
          <div className="flex items-center gap-2">
            <Icon name="box" size={16} color={colors.textSecondary} />
            <select
              value={layout}
              onChange={(e) => handleLayoutChange(e.target.value as LayoutType)}
              className="text-sm px-2 py-1 rounded border cursor-pointer"
              style={{
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
                minWidth: "140px",
              }}
            >
              {(Object.keys(LAYOUTS) as LayoutType[]).map((key) => (
                <option key={key} value={key}>
                  {LAYOUTS[key].name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2 flex-1" style={{ maxWidth: "300px" }}>
            <Icon name="search" size={16} color={colors.textSecondary} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search nodes..."
              className="text-sm px-3 py-1.5 rounded border flex-1"
              style={{
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="text-xs"
                style={{ color: colors.textSecondary }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            className="excalidraw-button px-3 py-1.5 flex items-center gap-2"
            style={{
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            }}
            title="Refresh graph"
          >
            <span style={{ fontSize: "16px" }}>↻</span>
            <span className="text-sm">Refresh</span>
          </button>
        </div>

        {/* Bottom Row: Filters and Stats */}
        <div
          className="px-4 py-2 flex items-center gap-4 border-t"
          style={{ borderColor: colors.border }}
        >
          {/* Filters */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
              SHOW:
            </span>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showHierarchy}
                onChange={(e) => setFilters({ ...filters, showHierarchy: e.target.checked })}
                className="cursor-pointer"
              />
              <span style={{ color: colors.text }}>Hierarchy</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showLinks}
                onChange={(e) => setFilters({ ...filters, showLinks: e.target.checked })}
                className="cursor-pointer"
              />
              <span style={{ color: colors.text }}>Links</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showOrphans}
                onChange={(e) => setFilters({ ...filters, showOrphans: e.target.checked })}
                className="cursor-pointer"
              />
              <span style={{ color: colors.text }}>Orphans</span>
            </label>
          </div>

          <div style={{ flex: 1 }} />

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs" style={{ color: colors.textSecondary }}>
            <div className="flex items-center gap-1">
              <span style={{ fontWeight: 600 }}>{stats.nodes}</span>
              <span>nodes</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span style={{ fontWeight: 600 }}>{stats.edges}</span>
              <span>edges</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span style={{ fontWeight: 600 }}>{stats.orphans}</span>
              <span>orphans</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span>depth</span>
              <span style={{ fontWeight: 600 }}>{stats.maxDepth}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Container */}
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
