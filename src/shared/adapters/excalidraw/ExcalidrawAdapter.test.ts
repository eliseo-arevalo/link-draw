import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { beforeEach, describe, expect, it, type Mocked, vi } from "vitest"
import type { ExcalidrawContent } from "@/shared/types/drawing"
import { ExcalidrawAdapter } from "./ExcalidrawAdapter"

interface MockElement {
  id: string
  link?: string
}

// Mock drawing-links library
vi.mock("@/shared/lib/drawing-links", () => ({
  findDrawingLinks: (elements: MockElement[]) => {
    return elements
      .filter((el) => el.link?.startsWith("drawing://"))
      .map((el) => ({
        elementId: el.id,
        drawingId: el.link?.replace("drawing://", "") || "",
        targetType: "drawing",
        link: el.link,
      }))
  },
}))

describe("ExcalidrawAdapter", () => {
  let adapter: ExcalidrawAdapter
  let mockApi: Mocked<ExcalidrawImperativeAPI>

  beforeEach(() => {
    adapter = new ExcalidrawAdapter()
    mockApi = {
      getSceneElements: vi.fn().mockReturnValue([]),
      updateScene: vi.fn(),
      getAppState: vi.fn().mockReturnValue({}),
      getFiles: vi.fn().mockReturnValue({}),
      addFiles: vi.fn(),
    } as unknown as Mocked<ExcalidrawImperativeAPI>
  })

  describe("setAPI / getAPI", () => {
    it("should store and retrieve the API", () => {
      expect(adapter.getAPI()).toBeNull()
      adapter.setAPI(mockApi)
      expect(adapter.getAPI()).toBe(mockApi)
    })
  })

  describe("Operations without API", () => {
    // Should not throw, should return defaults or do nothing
    it("getElements should return empty array", () => {
      expect(adapter.getElements()).toEqual([])
    })

    it("setElements should not throw", () => {
      expect(() => adapter.setElements([])).not.toThrow()
    })

    it("getAppState should return empty object", () => {
      expect(adapter.getAppState()).toEqual({})
    })

    it("setAppState should not throw", () => {
      expect(() => adapter.setAppState({})).not.toThrow()
    })

    it("getFiles should return empty object", () => {
      expect(adapter.getFiles()).toEqual({})
    })

    it("setContent should not throw", () => {
      expect(() => adapter.setContent({ elements: [], appState: {}, files: {} })).not.toThrow()
    })

    it("clear should not throw", () => {
      expect(() => adapter.clear()).not.toThrow()
    })

    it("scrollToElement should not throw", () => {
      expect(() => adapter.scrollToElement("1")).not.toThrow()
    })

    it("highlightElement should not throw", () => {
      expect(() => adapter.highlightElement("1")).not.toThrow()
    })

    it("exportAsImage should throw", async () => {
      await expect(adapter.exportAsImage("png")).rejects.toThrow("Excalidraw API not initialized")
    })
  })

  describe("Operations with API", () => {
    beforeEach(() => {
      adapter.setAPI(mockApi)
    })

    it("getElements should delegate to API", () => {
      const mockElements = [{ id: "1" }]
      mockApi.getSceneElements.mockReturnValue(mockElements as never)
      expect(adapter.getElements()).toBe(mockElements)
    })

    it("setElements should delegate to API", () => {
      const mockElements = [{ id: "1" }]
      adapter.setElements(mockElements as never)
      expect(mockApi.updateScene).toHaveBeenCalledWith({ elements: mockElements })
    })

    it("getAppState should delegate to API", () => {
      const mockState = { zoom: 1 }
      mockApi.getAppState.mockReturnValue(mockState as never)
      expect(adapter.getAppState()).toBe(mockState)
    })

    it("setAppState should delegate to API", () => {
      const mockState = { zoom: 2 }
      adapter.setAppState(mockState as never)
      expect(mockApi.updateScene).toHaveBeenCalledWith({ appState: mockState })
    })

    it("getContent should aggregate data", () => {
      const els = [{ id: "1" }]
      const state = { zoom: 1 }
      const files = { f1: {} }

      mockApi.getSceneElements.mockReturnValue(els as never)
      mockApi.getAppState.mockReturnValue(state as never)
      mockApi.getFiles.mockReturnValue(files as never)

      const content = adapter.getContent()
      expect(content).toEqual({ elements: els, appState: state, files })
    })

    it("setContent should update scene and add files", () => {
      const content: ExcalidrawContent = {
        elements: [{ id: "1" }] as never,
        appState: { zoom: 1, scrollX: 100, scrollY: 200 } as never,
        files: { f1: { id: "f1" } } as never,
      }

      adapter.setContent(content)

      // It should update elements and appState (scroll/zoom only)
      expect(mockApi.updateScene).toHaveBeenCalledWith({
        elements: content.elements,
        appState: {
          zoom: 1,
          scrollX: 100,
          scrollY: 200,
          collaborators: expect.any(Map),
          theme: "light",
        },
      })
      // It should add files
      expect(mockApi.addFiles).toHaveBeenCalledWith([{ id: "f1" }])
    })

    it("extractDrawingLinks should return links", () => {
      const elements = [
        { id: "1", link: "drawing://d1" },
        { id: "2", link: "http://google.com" },
      ]
      mockApi.getSceneElements.mockReturnValue(elements as never)

      const links = adapter.extractDrawingLinks()

      expect(links).toHaveLength(1)
      expect(links[0]).toEqual({
        elementId: "1",
        targetDrawingId: "d1",
        targetType: "drawing",
      })
    })

    it("markAsSaved and hasUnsavedChanges should track state", () => {
      mockApi.getSceneElements.mockReturnValue([])
      mockApi.getAppState.mockReturnValue({} as never)
      mockApi.getFiles.mockReturnValue({})

      // Initial state
      adapter.markAsSaved()
      expect(adapter.hasUnsavedChanges()).toBe(false)

      // Change content
      mockApi.getSceneElements.mockReturnValue([{ id: "new" }] as never)
      expect(adapter.hasUnsavedChanges()).toBe(true)

      // Save again
      adapter.markAsSaved()
      expect(adapter.hasUnsavedChanges()).toBe(false)
    })

    it("clear should reset scene", () => {
      adapter.clear()
      expect(mockApi.updateScene).toHaveBeenCalledWith({
        elements: [],
        appState: { viewBackgroundColor: "#ffffff" },
      })
    })

    it("scrollToElement should center on element", () => {
      mockApi.getSceneElements.mockReturnValue([{ id: "1", x: 100, y: 100 }] as never)
      // Mock window dimensions
      Object.defineProperty(window, "innerWidth", { value: 1000, writable: true })
      Object.defineProperty(window, "innerHeight", { value: 800, writable: true })

      adapter.scrollToElement("1")

      expect(mockApi.updateScene).toHaveBeenCalledWith(
        expect.objectContaining({
          appState: expect.objectContaining({
            scrollX: expect.any(Number),
            scrollY: expect.any(Number),
          }),
        })
      )
    })

    it("highlightElement should select element", () => {
      adapter.highlightElement("1")
      expect(mockApi.updateScene).toHaveBeenCalledWith({
        appState: { selectedElementIds: { "1": true } },
      })
    })

    it("getStats should return counts", () => {
      const els = [{ id: "1", link: "drawing://d1" }, { id: "2" }]
      const files = { f1: {} }

      mockApi.getSceneElements.mockReturnValue(els as never)
      mockApi.getFiles.mockReturnValue(files as never)

      const stats = adapter.getStats()

      expect(stats).toEqual({
        elementCount: 2,
        linkCount: 1,
        fileCount: 1,
      })
    })
  })

  describe("Observers", () => {
    it("should notify change listeners", () => {
      const spy = vi.fn()
      const unsubscribe = adapter.onChange(spy)

      adapter.notifyChange()
      expect(spy).toHaveBeenCalled()

      unsubscribe()
      adapter.notifyChange()
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should notify save listeners", () => {
      const spy = vi.fn()
      const unsubscribe = adapter.onSave(spy)

      adapter.notifySave()
      expect(spy).toHaveBeenCalled()

      unsubscribe()
      adapter.notifySave()
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
