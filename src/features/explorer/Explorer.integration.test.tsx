import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useTreeStore } from "@/shared/store/treeStore"

const mocks = vi.hoisted(() => ({
  repository: {
    getDrawingsTree: vi.fn(),
    loadDrawing: vi.fn(),
    createDrawing: vi.fn(),
    saveDrawing: vi.fn(),
  },
  drawingService: { moveDrawing: vi.fn() },
}))

vi.mock("@/shared/providers/ServiceProvider", () => ({
  useServices: () => mocks,
}))
vi.mock("./components/ExplorerToolbar", () => ({
  ExplorerToolbar: ({ onNewDrawing }: { onNewDrawing: () => void }) => (
    <button type="button" onClick={onNewDrawing}>
      New drawing
    </button>
  ),
}))
vi.mock("./components/ExplorerFooter", () => ({
  ExplorerFooter: () => <footer>Explorer footer</footer>,
}))
vi.mock("./components/BacklinksPanel", () => ({
  BacklinksPanel: () => <div>Backlinks</div>,
}))
vi.mock("./components/TreeNode", () => ({
  TreeNode: ({ node }: { node: { title: string } }) => <div>{node.title}</div>,
}))
vi.mock("./components/ExplorerMenuModal", () => ({
  ExplorerMenuModal: () => <div>Menu</div>,
}))

import { Explorer } from "./Explorer"

describe("Explorer integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.repository.getDrawingsTree.mockResolvedValue([])
    useTreeStore.setState({ tree: [] })
    useDrawingStore.setState({ activeDrawingId: null })
  })
  afterEach(cleanup)

  it("loads the drawing tree and renders the empty explorer shell", async () => {
    render(
      <Explorer
        isCollapsed={false}
        onToggleSidebar={vi.fn()}
        onToggleGraph={vi.fn()}
        isGraphView={false}
      />
    )
    await waitFor(() => expect(mocks.repository.getDrawingsTree).toHaveBeenCalled())
    expect(screen.getByText("No drawings yet")).toBeTruthy()
    expect(screen.getByRole("button", { name: "New drawing" })).toBeTruthy()
    expect(screen.getByText("Explorer footer")).toBeTruthy()
  })
})
