import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useTreeStore } from "@/shared/store/treeStore"
import { useTreeNode } from "./useTreeNode"

vi.mock("@/shared/providers/ServiceProvider", () => ({
  useServices: vi.fn(),
}))

describe("useTreeNode", () => {
  const mockRepository = {
    createDrawing: vi.fn(),
    saveDrawing: vi.fn(),
    getDrawingsTree: vi.fn(),
    updateDrawingTitle: vi.fn(),
    deleteDrawing: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(useServices).mockReturnValue({
      repository: mockRepository as any,
      drawingService: {} as any,
      linkService: {} as any,
      adapter: {} as any,
      projectTransferService: {} as any,
    })

    useTreeStore.setState({
      tree: [
        {
          id: "parent-1",
          title: "Parent",
          parent_id: null,
          is_public: false,
          created_at: "",
          updated_at: "",
          content: { elements: [], appState: {}, files: {} },
          children: [],
        },
      ],
    })
    useDrawingStore.setState({ activeDrawingId: null })
  })

  it("expands parent node when handleCreateChild is called", async () => {
    mockRepository.createDrawing.mockResolvedValue("child-1")
    mockRepository.saveDrawing.mockResolvedValue(undefined)
    mockRepository.getDrawingsTree.mockResolvedValue([
      {
        id: "parent-1",
        title: "Parent",
        parent_id: null,
        is_public: false,
        created_at: "",
        updated_at: "",
        content: { elements: [], appState: {}, files: {} },
        children: [
          {
            id: "child-1",
            title: "Drawing 1",
            parent_id: "parent-1",
            is_public: false,
            created_at: "",
            updated_at: "",
            content: { elements: [], appState: {}, files: {} },
            children: [],
          },
        ],
      },
    ])

    const { result } = renderHook(() => useTreeNode("parent-1", "Parent", null, false))

    expect(result.current.isExpanded).toBe(false)

    await act(async () => {
      await result.current.handleCreateChild()
    })

    expect(result.current.isExpanded).toBe(true)
    expect(mockRepository.createDrawing).toHaveBeenCalledWith(expect.any(String), "parent-1")
    expect(useDrawingStore.getState().activeDrawingId).toBe("child-1")
  })
})
