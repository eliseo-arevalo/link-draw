import { beforeEach, describe, expect, it } from "vitest"
import type { DrawingTreeNode } from "@/shared/types/drawing"
import { useTreeStore } from "./treeStore"

function node(id: string, children: DrawingTreeNode[] = []): DrawingTreeNode {
  return {
    id,
    title: id,
    parent_id: null,
    is_public: false,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    content: { elements: [], appState: {}, files: {} },
    children,
  }
}

describe("treeStore", () => {
  beforeEach(() => useTreeStore.setState({ tree: [] }))

  it("sets the complete tree", () => {
    const tree = [node("root")]
    useTreeStore.getState().setTree(tree)
    expect(useTreeStore.getState().tree).toBe(tree)
  })

  it("adds roots and nested children without duplicating IDs", () => {
    const store = useTreeStore.getState()
    store.addDrawingToTree("root", "Root", null)
    useTreeStore.getState().addDrawingToTree("child", "Child", "root")
    useTreeStore.getState().addDrawingToTree("child", "Duplicate", "root")

    const [root] = useTreeStore.getState().tree
    expect(root.title).toBe("Root")
    expect(root.children?.map((child) => child.id)).toEqual(["child"])
    expect(root.children?.[0].parent_id).toBe("root")
  })

  it("removes a nested subtree", () => {
    useTreeStore.setState({ tree: [node("root", [node("child", [node("grandchild")])])] })
    useTreeStore.getState().removeDrawingFromTree("child")
    expect(useTreeStore.getState().tree[0].children).toEqual([])
  })

  it("updates titles and replaces IDs recursively", () => {
    useTreeStore.setState({ tree: [node("root", [node("temporary")])] })
    useTreeStore.getState().updateTitleInTree("temporary", "Renamed")
    useTreeStore.getState().replaceDrawingId("temporary", "real")

    expect(useTreeStore.getState().tree[0].children?.[0]).toMatchObject({
      id: "real",
      title: "Renamed",
    })
  })

  it("finds nodes and returns their path", () => {
    useTreeStore.setState({ tree: [node("root", [node("child", [node("leaf")])])] })
    expect(useTreeStore.getState().findDrawingInTree("leaf")?.id).toBe("leaf")
    expect(useTreeStore.getState().findDrawingInTree("missing")).toBeNull()
    expect(useTreeStore.getState().getDrawingPath("leaf")).toEqual(["root", "child", "leaf"])
  })
})
