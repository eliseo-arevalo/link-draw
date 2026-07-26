import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useServices } from "@/shared/providers/ServiceProvider"
import { BacklinksPanel } from "./BacklinksPanel"

vi.mock("@/shared/providers/ServiceProvider", () => ({
  useServices: vi.fn(),
}))

describe("BacklinksPanel", () => {
  const mockLinkService = {
    getBacklinks: vi.fn(),
  }

  const mockColors = {
    background: "#fff",
    border: "#ccc",
    text: "#000",
    textSecondary: "#666",
    hoverBackground: "#eee",
    badgeBg: "#ddd",
    iconColor: "#444",
    accent: "#6366f1",
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useServices).mockReturnValue({
      linkService: mockLinkService as any,
      repository: {} as any,
      drawingService: {} as any,
      adapter: {} as any,
      projectTransferService: {} as any,
    })
  })

  it("renders null if no activeDrawingId", () => {
    const { container } = render(
      <BacklinksPanel activeDrawingId={null} colors={mockColors} onSelectDrawing={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("fetches and displays backlinks for active drawing", async () => {
    mockLinkService.getBacklinks.mockResolvedValue([
      {
        sourceDrawingId: "drawing-1",
        sourceDrawingTitle: "Diagram A",
        elementId: "elem-123",
        targetDrawingId: "active-1",
        targetType: "drawing",
      },
    ])

    const onSelect = vi.fn()
    render(
      <BacklinksPanel activeDrawingId="active-1" colors={mockColors} onSelectDrawing={onSelect} />
    )

    await waitFor(() => {
      expect(screen.getByText("BACKLINKS")).toBeTruthy()
    })

    // Expand the panel
    fireEvent.click(screen.getByText("BACKLINKS"))

    await waitFor(() => {
      expect(screen.getByText("Diagram A")).toBeTruthy()
    })

    const item = screen.getByText("Diagram A")
    fireEvent.click(item)
    expect(onSelect).toHaveBeenCalledWith("drawing-1", "elem-123")
  })
})
