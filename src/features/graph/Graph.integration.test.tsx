import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const collection = {
    forEach: vi.fn(),
    filter: vi.fn(() => ({ length: 0 })),
    removeClass: vi.fn(),
    length: 0,
  }
  const layout = { run: vi.fn(), stop: vi.fn() }
  const core = {
    layout: vi.fn(() => layout),
    on: vi.fn(),
    nodes: vi.fn(() => collection),
    elements: vi.fn(() => ({ remove: vi.fn() })),
    add: vi.fn(),
    destroy: vi.fn(),
    zoom: vi.fn(() => 1),
    fit: vi.fn(),
  }
  return {
    cytoscape: vi.fn(() => core),
    repository: { listDrawings: vi.fn() },
    core,
  }
})

vi.mock("cytoscape", () => ({ default: mocks.cytoscape }))
vi.mock("@/shared/providers/ServiceProvider", () => ({
  useServices: () => ({ repository: mocks.repository }),
}))

import { Graph } from "./Graph"

describe("Graph integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.repository.listDrawings.mockResolvedValue([])
  })
  afterEach(cleanup)

  it("loads repository data, creates the graph and renders its empty state", async () => {
    render(<Graph />)
    expect(screen.getByText("Graph view")).toBeTruthy()
    expect(screen.getByRole("searchbox", { name: "Search drawings in graph" })).toBeTruthy()
    await waitFor(() => expect(mocks.repository.listDrawings).toHaveBeenCalled())
    await waitFor(() => expect(mocks.cytoscape).toHaveBeenCalled())
    expect(screen.getByText("Your graph will appear here")).toBeTruthy()
    expect(mocks.core.layout).toHaveBeenCalled()
  })
})
