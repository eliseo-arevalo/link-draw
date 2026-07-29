import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  adapter: {
    getElementLink: vi.fn(),
    getSelectedElementIds: vi.fn(() => []),
    setElementLink: vi.fn(),
    addElements: vi.fn(),
    notifyChange: vi.fn(),
  },
  repository: { loadDrawing: vi.fn() },
  drawingService: {},
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
  useAutoSave: () => ({
    triggerSave: vi.fn(),
    forceSave: vi.fn(),
    cancelSave: vi.fn(),
  }),
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
  useCanvasLoader: () => ({ saveAllCachedDrawings: vi.fn(), clearCache: vi.fn() }),
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
  afterEach(cleanup)

  it("composes the canvas surface with application services and controls", async () => {
    render(<Canvas />)
    expect(await screen.findByText("Excalidraw surface")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Link" })).toBeTruthy()
  })
})
