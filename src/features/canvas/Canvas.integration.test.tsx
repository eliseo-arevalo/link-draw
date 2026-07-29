import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDrawingStore } from "@/shared/store/drawingStore"

const mocks = vi.hoisted(() => ({
  adapter: {
    getElementLink: vi.fn(),
    getSelectedElementIds: vi.fn(() => []),
    setElementLink: vi.fn(),
    addElements: vi.fn(),
    notifyChange: vi.fn(),
    getContent: vi.fn(),
    markAsSaved: vi.fn(),
  },
  repository: { loadDrawing: vi.fn(), saveDrawing: vi.fn() },
  drawingService: {},
  autoSaveCallbacks: [] as Array<() => Promise<void>>,
  cancelSave: vi.fn(),
  saveAllCachedDrawings: vi.fn(),
}))

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: ({ renderTopRightUI }: { renderTopRightUI?: () => React.ReactNode }) => (
    <div>
      Excalidraw surface
      {renderTopRightUI?.()}
    </div>
  ),
  viewportCoordsToSceneCoords: ({ clientX, clientY }: { clientX: number; clientY: number }) => ({
    x: clientX,
    y: clientY,
  }),
}))
vi.mock("@/shared/providers/ServiceProvider", () => ({
  useServices: () => mocks,
}))
vi.mock("@/shared/hooks/useAutoSave", () => ({
  useAutoSave: (onSave: () => Promise<void>) => {
    mocks.autoSaveCallbacks.push(onSave)
    return {
    triggerSave: vi.fn(),
    forceSave: vi.fn(),
      cancelSave: mocks.cancelSave,
    }
  },
}))
vi.mock("@/shared/hooks/useIsMobile", () => ({ useIsMobile: () => false }))
vi.mock("@/shared/hooks/useKeyboardShortcuts", () => ({ useKeyboardShortcuts: vi.fn() }))
vi.mock("./hooks/useElementSelection", () => ({
  useElementSelection: () => ({ selectedElementIds: [], hasSelection: false }),
}))
vi.mock("./hooks/useLinkNavigation", () => ({
  useLinkNavigation: () => ({ handleLinkOpen: vi.fn(), errorMessage: null, clearError: vi.fn() }),
}))
vi.mock("./hooks/useCanvasLoader", () => ({
  useCanvasLoader: () => ({
    saveAllCachedDrawings: mocks.saveAllCachedDrawings,
    clearCache: vi.fn(),
  }),
}))
vi.mock("./hooks/useFirstLaunchLinkDemo", () => ({ useFirstLaunchLinkDemo: () => null }))
vi.mock("./components/DrawingPickerModal", () => ({ DrawingPickerModal: () => null }))
vi.mock("./components/GlobalWikiModal", () => ({ GlobalWikiModal: () => null }))
vi.mock("./components/DrawingLinkPreviewPopover", () => ({ DrawingLinkPreviewPopover: () => null }))
vi.mock("./components/LinkButton", () => ({
  LinkButton: () => <button type="button">Link</button>,
}))
vi.mock("./components/LinkDemoGuide", () => ({ LinkDemoGuide: () => null }))
vi.mock("./components/DemoNavigationCursor", () => ({ DemoNavigationCursor: () => null }))
vi.mock("./components/DemoWikiSuggestion", () => ({ DemoWikiSuggestion: () => null }))

import { Canvas } from "./Canvas"

describe("Canvas integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.autoSaveCallbacks.length = 0
    mocks.saveAllCachedDrawings.mockResolvedValue(undefined)
    mocks.repository.saveDrawing.mockResolvedValue(undefined)
    useDrawingStore.setState({ activeDrawingId: null, isImporting: false })
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("composes the canvas surface with application services and controls", async () => {
    render(<Canvas />)
    expect(await screen.findByText("Excalidraw surface")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Link" })).toBeTruthy()
  })

  it("cancels navigation saves and rejects a stale callback bound to the previous drawing", async () => {
    useDrawingStore.setState({ activeDrawingId: "drawing-a" })
    render(<Canvas />)
    const saveForDrawingA = mocks.autoSaveCallbacks.at(-1)
    expect(saveForDrawingA).toBeDefined()

    act(() => useDrawingStore.getState().setActiveDrawingId("drawing-b"))
    await waitFor(() => expect(mocks.cancelSave).toHaveBeenCalled())
    await act(async () => saveForDrawingA?.())

    expect(mocks.adapter.getContent).not.toHaveBeenCalled()
    expect(mocks.repository.saveDrawing).not.toHaveBeenCalled()
  })
})
