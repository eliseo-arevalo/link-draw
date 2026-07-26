import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { GlobalWikiModal } from "./GlobalWikiModal"

const { getDrawingsTree } = vi.hoisted(() => ({
  getDrawingsTree: vi.fn().mockResolvedValue([
    {
      id: "welcome",
      title: "Welcome to Link Draw",
      parentId: null,
      children: [],
    },
  ]),
}))

vi.mock("@/shared/providers/ServiceProvider", () => ({
  useServices: () => ({
    repository: { getDrawingsTree },
  }),
}))

vi.mock("@/shared/store/themeStore", () => ({
  useThemeStore: () => ({ theme: "light" }),
}))

describe("GlobalWikiModal", () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it("keeps the Excalidraw text editor focused when a result is clicked", async () => {
    const textarea = document.createElement("textarea")
    textarea.className = "excalidraw-wysiwyg"
    textarea.value = "[["
    document.body.append(textarea)
    textarea.focus()

    const onSelectDrawing = vi.fn()
    render(
      <GlobalWikiModal
        isOpen
        onClose={vi.fn()}
        onSelectDrawing={onSelectDrawing}
        currentDrawingId={null}
        filterText=""
      />
    )

    const result = await screen.findByRole("button", { name: /Welcome to Link Draw/ })
    const mouseDownCompleted = fireEvent.mouseDown(result)

    expect(mouseDownCompleted).toBe(false)
    expect(document.activeElement).toBe(textarea)

    fireEvent.click(result)
    expect(onSelectDrawing).toHaveBeenCalledWith("welcome", "Welcome to Link Draw")
  })
})
