import { describe, expect, it } from "vitest"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import type { DrawingInput } from "@/shared/types/drawing"

export function runGraphRepositoryContractTests(
  createRepository: () => Promise<IGraphRepository> | IGraphRepository,
  _cleanup?: () => Promise<void> | void
) {
  describe("IGraphRepository Contract Tests", () => {
    it("should create, save, and load a drawing", async () => {
      const repo = await createRepository()
      const id = await repo.createDrawing("Test Drawing")
      expect(id).toBeDefined()
      expect(typeof id).toBe("string")

      const loaded = await repo.loadDrawing(id)
      expect(loaded).not.toBeNull()
      expect(loaded?.id).toBe(id)
      expect(loaded?.title).toBe("Test Drawing")
      expect(loaded?.parent_id).toBeNull()

      const updateData: DrawingInput = {
        title: "Updated Title",
        content: {
          elements: [
            {
              id: "el1",
              type: "rectangle",
              x: 0,
              y: 0,
              width: 10,
              height: 10,
            },
          ],
          appState: { viewBackgroundColor: "#000000" },
          files: {},
        },
        is_public: true,
      }

      await repo.saveDrawing(id, updateData)
      const reloaded = await repo.loadDrawing(id)
      expect(reloaded?.title).toBe("Updated Title")
      expect(reloaded?.is_public).toBe(true)
      expect(reloaded?.content.elements).toHaveLength(1)
      expect(reloaded?.content.elements[0].id).toBe("el1")
    })

    it("should set valid timestamps and unique UUIDs", async () => {
      const repo = await createRepository()
      const id1 = await repo.createDrawing("Drawing 1")
      const id2 = await repo.createDrawing("Drawing 2")
      expect(id1).not.toBe(id2)

      const drawing1 = await repo.loadDrawing(id1)
      expect(drawing1?.created_at).toBeDefined()
      expect(drawing1?.updated_at).toBeDefined()
      expect(new Date(drawing1?.created_at ?? "").getTime()).not.toBeNaN()
    })

    it("should validate non-existent parent on creation", async () => {
      const repo = await createRepository()
      await expect(repo.createDrawing("Child", "non-existent-id")).rejects.toThrow(
        "Parent drawing non-existent-id not found"
      )
    })

    it("should validate non-existent parent and circular reference when setting parent", async () => {
      const repo = await createRepository()
      const rootId = await repo.createDrawing("Root")
      const childId = await repo.createDrawing("Child", rootId)

      // Setting non-existent parent
      await expect(repo.setDrawingParent(childId, "missing-parent")).rejects.toThrow(
        "Parent drawing missing-parent not found"
      )

      // Self parent
      await expect(repo.setDrawingParent(rootId, rootId)).rejects.toThrow(
        "A drawing cannot be its own parent"
      )

      // Circular reference (making root parented to child)
      await expect(repo.setDrawingParent(rootId, childId)).rejects.toThrow(
        "This would create a circular reference"
      )
    })

    it("should build multi-level tree, get children, and get summaries correctly", async () => {
      const repo = await createRepository()
      const rootId = await repo.createDrawing("Root")
      const child1Id = await repo.createDrawing("Child 1", rootId)
      const child2Id = await repo.createDrawing("Child 2", rootId)
      const grandChildId = await repo.createDrawing("Grandchild", child1Id)

      const tree = await repo.getDrawingsTree()
      expect(tree.length).toBeGreaterThanOrEqual(1)
      const rootNode = tree.find((node) => node.id === rootId)
      expect(rootNode).toBeDefined()
      expect(rootNode?.children).toHaveLength(2)

      const child1Node = rootNode?.children?.find((c) => c.id === child1Id)
      expect(child1Node?.children).toHaveLength(1)
      expect(child1Node?.children?.[0].id).toBe(grandChildId)

      const childrenOfRoot = await repo.getDrawingChildren(rootId)
      expect(childrenOfRoot).toHaveLength(2)
      expect(childrenOfRoot.map((c) => c.id)).toContain(child1Id)
      expect(childrenOfRoot.map((c) => c.id)).toContain(child2Id)

      const summaries = await repo.getDrawingSummaries()
      const rootSummary = summaries.find((s) => s.id === rootId)
      expect(rootSummary?.hasChildren).toBe(true)
      const grandChildSummary = summaries.find((s) => s.id === grandChildId)
      expect(grandChildSummary?.hasChildren).toBe(false)
    })

    it("should perform recursive deletion of target and all descendants", async () => {
      const repo = await createRepository()
      const rootId = await repo.createDrawing("Root")
      const childId = await repo.createDrawing("Child", rootId)
      const grandChildId = await repo.createDrawing("GrandChild", childId)
      const siblingId = await repo.createDrawing("Sibling", rootId)

      // Delete child (should delete child & grandChild, but keep root & sibling)
      await repo.deleteDrawing(childId)

      expect(await repo.exists(childId)).toBe(false)
      expect(await repo.exists(grandChildId)).toBe(false)
      expect(await repo.exists(rootId)).toBe(true)
      expect(await repo.exists(siblingId)).toBe(true)
    })

    it("should duplicate drawings with and without descendants", async () => {
      const repo = await createRepository()
      const rootId = await repo.createDrawing("Root")
      const childId = await repo.createDrawing("Child", rootId)
      await repo.createDrawing("Grandchild", childId)

      // Duplicate child WITHOUT children
      const dupNoChildrenId = await repo.duplicateDrawing(childId, false)
      expect(dupNoChildrenId).not.toBe("")
      expect(await repo.exists(dupNoChildrenId)).toBe(true)
      const childrenOfDupNo = await repo.getDrawingChildren(dupNoChildrenId)
      expect(childrenOfDupNo).toHaveLength(0)

      // Duplicate child WITH children
      const dupWithChildrenId = await repo.duplicateDrawing(childId, true)
      expect(dupWithChildrenId).not.toBe("")
      expect(await repo.exists(dupWithChildrenId)).toBe(true)
      const childrenOfDupWith = await repo.getDrawingChildren(dupWithChildrenId)
      expect(childrenOfDupWith).toHaveLength(1)
      expect(childrenOfDupWith[0].title).toContain("(copy)")
    })

    it("should replace all drawings atomically", async () => {
      const repo = await createRepository()
      const id1 = await repo.createDrawing("Initial Drawing")

      const newDrawings = [
        {
          id: "replaced-1",
          title: "Replaced 1",
          parent_id: null,
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
        {
          id: "replaced-2",
          title: "Replaced 2",
          parent_id: "replaced-1",
          is_public: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
      ]

      await repo.replaceAllDrawings(newDrawings)

      expect(await repo.exists(id1)).toBe(false)
      expect(await repo.exists("replaced-1")).toBe(true)
      expect(await repo.exists("replaced-2")).toBe(true)

      const all = await repo.listDrawings()
      expect(all).toHaveLength(2)
    })

    it("should update drawing title and public status", async () => {
      const repo = await createRepository()
      const id = await repo.createDrawing("Original Title")

      await repo.updateDrawingTitle(id, "New Title")
      let drawing = await repo.loadDrawing(id)
      expect(drawing?.title).toBe("New Title")

      await repo.togglePublic(id, true)
      drawing = await repo.loadDrawing(id)
      expect(drawing?.is_public).toBe(true)
    })

    it("should throw when trying to update non-existent drawing", async () => {
      const repo = await createRepository()
      await expect(repo.updateDrawingTitle("missing", "Title")).rejects.toThrow(
        "Drawing missing not found"
      )
      await expect(repo.togglePublic("missing", true)).rejects.toThrow("Drawing missing not found")
      await expect(
        repo.saveDrawing("missing", { content: { elements: [], appState: {}, files: {} } })
      ).rejects.toThrow("Drawing missing not found")
      await expect(repo.deleteDrawing("missing")).rejects.toThrow("Drawing missing not found")
    })
  })
}
