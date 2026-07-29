import { describe, expect, it, vi } from "vitest"
import type { Drawing } from "@/shared/types/drawing"
import { buildGraphElements } from "./graph-builder"
import { buildHierarchyEdges, buildLinkEdges, buildNodes } from "./graph-elements"
import { buildGraphMaps, calculateMaxDepth, getNodeColor } from "./graph-utils"
import { extractLinks } from "./link-extractor"

function drawing(id: string, parentId: string | null = null, links: string[] = []): Drawing {
  return {
    id,
    title: id.toUpperCase(),
    parent_id: parentId,
    is_public: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    content: {
      elements: links.map((link, index) => ({ id: `${id}-${index}`, link })),
      appState: {},
      files: {},
    },
  }
}

describe("graph libraries", () => {
  const drawings = [
    drawing("root"),
    drawing("child", "root", ["drawing://target", "drawing://target#element=one"]),
    drawing("target"),
  ]

  it("extracts and deduplicates drawing links while ignoring unrelated links", () => {
    const source = drawing("source", null, [
      "drawing://one",
      "drawing://one#element=x",
      "https://example.com",
    ])

    expect(extractLinks(source)).toEqual(["one"])
  })

  it("builds hierarchy, child and link maps", () => {
    const maps = buildGraphMaps(drawings, extractLinks)

    expect(maps.parentMap.get("child")).toBe("root")
    expect(maps.childrenMap.get("root")).toEqual(new Set(["child"]))
    expect(maps.linkMap.get("child")).toEqual(new Set(["target"]))
  })

  it("assigns colors for roots, links, parents, orphans and regular children", () => {
    const children = new Map([
      ["root", new Set(["child"])],
      ["parent", new Set(["leaf"])],
    ])
    const links = new Map([["linked", new Set(["target"])]])

    expect(getNodeColor(drawing("root"), children, links)).toBe("#8b5cf6")
    expect(getNodeColor(drawing("linked", "root"), children, links)).toBe("#3b82f6")
    expect(getNodeColor(drawing("parent", "root"), children, links)).toBe("#10b981")
    expect(getNodeColor(drawing("orphan"), children, links)).toBe("#6b7280")
    expect(getNodeColor(drawing("leaf", "parent"), children, links)).toBe("#6366f1")
  })

  it("calculates depth and safely stops malformed cycles", () => {
    expect(
      calculateMaxDepth(
        new Set(["root", "child", "leaf"]),
        new Map([
          ["child", "root"],
          ["leaf", "child"],
        ])
      )
    ).toBe(2)
    expect(calculateMaxDepth(new Set(), new Map())).toBe(0)
    expect(
      calculateMaxDepth(
        new Set(["a", "b"]),
        new Map([
          ["a", "b"],
          ["b", "a"],
        ])
      )
    ).toBe(2)
  })

  it("builds nodes and filters root/orphan drawings", () => {
    const maps = buildGraphMaps(drawings, extractLinks)
    const all = buildNodes(
      drawings,
      { showHierarchy: true, showLinks: true, showOrphans: true },
      maps
    )
    const withoutRoots = buildNodes(
      drawings,
      { showHierarchy: true, showLinks: true, showOrphans: false },
      maps
    )

    expect(all.nodeIds).toEqual(new Set(["root", "child", "target"]))
    expect(all.orphanCount).toBe(2)
    expect(withoutRoots.nodeIds).toEqual(new Set(["child"]))
    expect(withoutRoots.orphanCount).toBe(0)
  })

  it("only creates edges whose endpoints are visible", () => {
    const visible = new Set(["root", "child", "target"])
    expect(buildHierarchyEdges(drawings, visible)).toHaveLength(1)
    expect(buildHierarchyEdges(drawings, new Set(["child"]))).toEqual([])
    expect(buildLinkEdges(drawings, visible, extractLinks)).toHaveLength(1)
    expect(buildLinkEdges(drawings, new Set(["child"]), extractLinks)).toEqual([])
  })

  it("assembles filtered graph elements and accurate stats", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const result = buildGraphElements(drawings, {
      showHierarchy: true,
      showLinks: true,
      showOrphans: true,
    })

    expect(result.stats).toEqual({ nodes: 3, edges: 2, orphans: 2, maxDepth: 1 })
    expect(result.elements.map((element) => element.data.id)).toEqual([
      "root",
      "child",
      "target",
      "h-root-child",
      "l-child-target",
    ])
  })
})
