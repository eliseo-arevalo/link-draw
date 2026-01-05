import { beforeEach, describe, expect, it, type Mocked, vi } from "vitest"
import type { ICanvasAdapter } from "@/shared/interfaces/ICanvasAdapter"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import type { Drawing, DrawingLink, DrawingTreeNode } from "@/shared/types/drawing"
import { LinkService } from "./LinkService"

describe("LinkService", () => {
  let service: LinkService
  let mockRepository: Mocked<IGraphRepository>
  let mockCanvas: Mocked<ICanvasAdapter>

  const mockDrawing1: Drawing = {
    id: "d1",
    title: "Drawing 1",
    content: { elements: [], appState: {}, files: {} },
    parent_id: null,
    is_public: false,
    created_at: "",
    updated_at: "",
  }

  beforeEach(() => {
    mockRepository = {
      loadDrawing: vi.fn(),
      listDrawings: vi.fn(),
      getDrawingsTree: vi.fn(),
      exists: vi.fn(),
    } as any

    mockCanvas = {
      extractDrawingLinks: vi.fn(),
    } as any

    service = new LinkService(mockRepository, mockCanvas)
  })

  describe("extractLinksFromCanvas", () => {
    it("should delegate to canvas adapter", () => {
      const mockLinks: DrawingLink[] = [
        { elementId: "e1", targetDrawingId: "d2", targetType: "drawing" },
      ]
      mockCanvas.extractDrawingLinks.mockReturnValue(mockLinks)

      const result = service.extractLinksFromCanvas()

      expect(mockCanvas.extractDrawingLinks).toHaveBeenCalled()
      expect(result).toEqual(mockLinks)
    })
  })

  describe("getDrawingLinks", () => {
    it("should extract links from drawing content", async () => {
      const drawingWithLinks = {
        ...mockDrawing1,
        content: {
          elements: [
            { id: "1", link: "excaligraph://drawing/d2" }, // Matching format in LinkService.ts
            { id: "2", link: "http://google.com" },
          ],
          appState: {},
          files: {},
        },
      }
      mockRepository.loadDrawing.mockResolvedValue(drawingWithLinks)

      const result = await service.getDrawingLinks("d1")

      expect(result).toHaveLength(1)
      expect(result[0].targetDrawingId).toBe("d2")
    })

    it("should return empty array if drawing not found", async () => {
      mockRepository.loadDrawing.mockResolvedValue(null)
      const result = await service.getDrawingLinks("missing")
      expect(result).toEqual([])
    })
  })

  describe("wouldCreateCircularReference (Tree hierarchy)", () => {
    // Tree: Root(1) -> Child(2) -> Grandchild(3)
    const mockTree: DrawingTreeNode[] = [
      {
        ...mockDrawing1,
        id: "1",
        children: [
          {
            ...mockDrawing1,
            id: "2",
            parent_id: "1",
            children: [{ ...mockDrawing1, id: "3", parent_id: "2" }],
          },
        ],
      },
    ]

    it("should detect self-reference", async () => {
      const result = await service.wouldCreateCircularReference("1", "1")
      expect(result.hasCircularReference).toBe(true)
    })

    it("should detect circular reference when moving parent to child", async () => {
      mockRepository.getDrawingsTree.mockResolvedValue(mockTree)

      // Try to make '3' (child) the parent of '1' (ancestor)
      // Actually, the method signature is (drawingId, newParentId)
      // So if we move '1' to be a child of '3', that is a cycle.
      const result = await service.wouldCreateCircularReference("1", "3")

      expect(result.hasCircularReference).toBe(true)
      expect(result.message).toContain("Circular reference detected")
    })

    it("should allow valid moves", async () => {
      mockRepository.getDrawingsTree.mockResolvedValue(mockTree)

      // Moving '3' to '1' is valid (skipping 2)
      const result = await service.wouldCreateCircularReference("3", "1")
      expect(result.hasCircularReference).toBe(false)
    })

    it("should return false if new parent is null", async () => {
      const result = await service.wouldCreateCircularReference("1", null)
      expect(result.hasCircularReference).toBe(false)
    })
  })

  describe("validateLinks", () => {
    it("should identify broken links", async () => {
      const drawingWithLinks = {
        ...mockDrawing1,
        content: {
          elements: [
            { id: "1", link: "excaligraph://drawing/d2" },
            { id: "2", link: "excaligraph://drawing/d3" },
          ],
        },
      } as any

      mockRepository.loadDrawing.mockResolvedValue(drawingWithLinks)
      mockRepository.exists.mockImplementation(async (id) => id === "d2") // d3 is missing

      const result = await service.validateLinks("d1")

      expect(result).toEqual(["d3"])
    })
  })

  describe("getBacklinks", () => {
    it("should find drawings linking to the target", async () => {
      const d1 = { ...mockDrawing1, id: "d1" }
      const d2 = {
        ...mockDrawing1,
        id: "d2",
        content: { elements: [{ id: "e1", link: "excaligraph://drawing/d1" }] },
      } as any
      const d3 = { ...mockDrawing1, id: "d3" }

      mockRepository.listDrawings.mockResolvedValue([d1, d2, d3])

      const result = await service.getBacklinks("d1")

      expect(result).toHaveLength(1)
      expect(result[0].elementId).toBe("e1")
    })
  })

  describe("wouldCreateCircularLinkReference (Link graph)", () => {
    it("should detect direct self-link", async () => {
      const result = await service.wouldCreateCircularLinkReference("d1", "d1")
      expect(result.hasCircularReference).toBe(true)
    })

    it("should detect cycle in link graph", async () => {
      // Setup existing links: d2 -> d1
      // Attempting to add link d1 -> d2 should create cycle
      const d2 = {
        ...mockDrawing1,
        id: "d2",
        content: { elements: [{ id: "e1", link: "excaligraph://drawing/d1" }] },
      } as any

      mockRepository.listDrawings.mockResolvedValue([d2])

      const result = await service.wouldCreateCircularLinkReference("d1", "d2")

      expect(result.hasCircularReference).toBe(true)
    })

    it("should allow non-circular links", async () => {
      // Setup: d2 -> d3
      // Add d1 -> d2. No cycle.
      const d2 = {
        ...mockDrawing1,
        id: "d2",
        content: { elements: [{ id: "e1", link: "excaligraph://drawing/d3" }] },
      } as any

      mockRepository.listDrawings.mockResolvedValue([d2])

      const result = await service.wouldCreateCircularLinkReference("d1", "d2")

      expect(result.hasCircularReference).toBe(false)
    })
  })
})
