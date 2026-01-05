import { beforeEach, describe, expect, it, type Mocked, vi } from "vitest"
import type { ICanvasAdapter } from "@/shared/interfaces/ICanvasAdapter"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import type { Drawing, DrawingInput } from "@/shared/types/drawing"
import { DrawingService } from "./DrawingService"

describe("DrawingService", () => {
  let service: DrawingService
  let mockRepository: Mocked<IGraphRepository>
  let mockCanvas: Mocked<ICanvasAdapter>

  const mockDrawing: Drawing = {
    id: "drawing-1",
    title: "Test Drawing",
    content: { elements: [], appState: {}, files: {} },
    parent_id: null,
    is_public: false,
    created_at: "2023-01-01",
    updated_at: "2023-01-01",
  }

  beforeEach(() => {
    // Manually mock the methods we need
    mockRepository = {
      createDrawing: vi.fn(),
      saveDrawing: vi.fn(),
      loadDrawing: vi.fn(),
      listDrawings: vi.fn(),
      getDrawingSummaries: vi.fn(),
      getDrawingsTree: vi.fn(),
      updateDrawingTitle: vi.fn(),
      deleteDrawing: vi.fn(),
      setDrawingParent: vi.fn(),
      togglePublic: vi.fn(),
    } as any

    mockCanvas = {
      getContent: vi.fn(),
      setContent: vi.fn(),
      markAsSaved: vi.fn(),
      hasUnsavedChanges: vi.fn(),
      getStats: vi.fn(),
    } as any

    service = new DrawingService(mockRepository, mockCanvas)
  })

  describe("createDrawing", () => {
    it("should create a drawing with correct parameters", async () => {
      mockRepository.createDrawing.mockResolvedValue("new-id")
      const input: DrawingInput = {
        title: "New Drawing",
        parent_id: null,
        content: { elements: [], appState: {}, files: {} },
      }

      const result = await service.createDrawing(input)

      expect(mockRepository.createDrawing).toHaveBeenCalledWith("New Drawing", null)
      expect(mockRepository.saveDrawing).toHaveBeenCalledWith("new-id", input)
      expect(result).toBe("new-id")
    })

    it("should default title if not provided", async () => {
      mockRepository.createDrawing.mockResolvedValue("new-id")
      const input: DrawingInput = {
        parent_id: null,
        content: { elements: [], appState: {}, files: {} },
      }

      await service.createDrawing(input)

      expect(mockRepository.createDrawing).toHaveBeenCalledWith("Untitled Drawing", null)
    })
  })

  describe("getDrawing", () => {
    it("should retrieve a drawing", async () => {
      mockRepository.loadDrawing.mockResolvedValue(mockDrawing)

      const result = await service.getDrawing("drawing-1")

      expect(mockRepository.loadDrawing).toHaveBeenCalledWith("drawing-1")
      expect(result).toEqual(mockDrawing)
    })
  })

  describe("updateTitle", () => {
    it("should update the title", async () => {
      await service.updateTitle("id-1", "New Title")
      expect(mockRepository.updateDrawingTitle).toHaveBeenCalledWith("id-1", "New Title")
    })

    it("should throw error if title is empty", async () => {
      await expect(service.updateTitle("id-1", "  ")).rejects.toThrow("Title cannot be empty")
    })
  })

  describe("updateContent", () => {
    it("should save canvas content", async () => {
      const mockContent = { elements: [{ id: "1" }] }
      mockCanvas.getContent.mockReturnValue(mockContent as any)

      await service.updateContent("id-1")

      expect(mockCanvas.getContent).toHaveBeenCalled()
      expect(mockRepository.saveDrawing).toHaveBeenCalledWith("id-1", { content: mockContent })
    })
  })

  describe("saveCurrentDrawing", () => {
    it("should save content and mark canvas as saved", async () => {
      const mockContent = { elements: [] }
      mockCanvas.getContent.mockReturnValue(mockContent as any)

      await service.saveCurrentDrawing("id-1")

      expect(mockRepository.saveDrawing).toHaveBeenCalledWith("id-1", { content: mockContent })
      expect(mockCanvas.markAsSaved).toHaveBeenCalled()
      expect(mockRepository.updateDrawingTitle).not.toHaveBeenCalled()
    })

    it("should update title if provided", async () => {
      const mockContent = { elements: [] }
      mockCanvas.getContent.mockReturnValue(mockContent as any)

      await service.saveCurrentDrawing("id-1", "New Title")

      expect(mockRepository.updateDrawingTitle).toHaveBeenCalledWith("id-1", "New Title")
    })
  })

  describe("loadDrawing", () => {
    it("should load drawing into canvas", async () => {
      mockRepository.loadDrawing.mockResolvedValue(mockDrawing)

      await service.loadDrawing("drawing-1")

      expect(mockRepository.loadDrawing).toHaveBeenCalledWith("drawing-1")
      expect(mockCanvas.setContent).toHaveBeenCalledWith(mockDrawing.content)
      expect(mockCanvas.markAsSaved).toHaveBeenCalled()
    })

    it("should throw if drawing not found", async () => {
      mockRepository.loadDrawing.mockResolvedValue(null)

      await expect(service.loadDrawing("missing")).rejects.toThrow("Drawing not found")
    })
  })

  describe("duplicateDrawing", () => {
    it("should duplicate a drawing", async () => {
      mockRepository.loadDrawing.mockResolvedValue(mockDrawing)
      mockRepository.createDrawing.mockResolvedValue("copy-id")

      const result = await service.duplicateDrawing("drawing-1")

      expect(mockRepository.loadDrawing).toHaveBeenCalledWith("drawing-1")
      expect(mockRepository.createDrawing).toHaveBeenCalledWith("Test Drawing (Copy)", null)
      expect(mockRepository.saveDrawing).toHaveBeenCalledWith("copy-id", {
        content: mockDrawing.content,
        is_public: mockDrawing.is_public,
      })
      expect(result).toBe("copy-id")
    })

    it("should throw if original drawing not found", async () => {
      mockRepository.loadDrawing.mockResolvedValue(null)
      await expect(service.duplicateDrawing("missing")).rejects.toThrow("Drawing not found")
    })
  })
})
