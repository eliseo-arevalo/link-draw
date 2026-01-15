import { describe, expect, it } from "vitest"
import type { DrawingTreeNode } from "@/shared/types/drawing"
import { generateUniqueDrawingName } from "./drawing-names"

describe("generateUniqueDrawingName", () => {
  it("should generate name with timestamp", () => {
    const tree: DrawingTreeNode[] = []
    const name = generateUniqueDrawingName(tree)

    expect(name).toMatch(/^Drawing - \w+ \d+, \d+:\d+ (AM|PM)$/)
  })

  it("should avoid conflicts with existing names", () => {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    const timestamp = formatter.format(now)
    const existingName = `Drawing - ${timestamp}`

    const tree: DrawingTreeNode[] = [
      {
        id: "1",
        title: existingName,
        parentId: null,
        children: [],
      },
    ]

    const name = generateUniqueDrawingName(tree)
    expect(name).toBe(`${existingName} (2)`)
  })

  it("should check nested children for conflicts", () => {
    const tree: DrawingTreeNode[] = [
      {
        id: "1",
        title: "Parent",
        parentId: null,
        children: [
          {
            id: "2",
            title: "Drawing - Jan 14, 9:27 PM",
            parentId: "1",
            children: [],
          },
        ],
      },
    ]

    const name = generateUniqueDrawingName(tree)
    // Should detect conflict in nested child
    expect(name).not.toBe("Drawing - Jan 14, 9:27 PM")
  })
})
