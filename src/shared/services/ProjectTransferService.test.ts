import { beforeEach, describe, expect, it } from "vitest"
import { LocalStorageRepository } from "@/shared/repositories/localStorage/LocalStorageRepository"
import { ProjectTransferService } from "@/shared/services/ProjectTransferService"
import type { Drawing } from "@/shared/types/drawing"

describe("ProjectTransferService", () => {
  let repository: LocalStorageRepository
  let service: ProjectTransferService

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    repository = new LocalStorageRepository()
    service = new ProjectTransferService(repository)
  })

  const sampleDrawings: Drawing[] = [
    {
      id: "drawing-1",
      title: "Root Drawing",
      parent_id: null,
      is_public: false,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      content: {
        elements: [
          {
            id: "el-1",
            type: "rectangle",
            x: 10,
            y: 10,
            width: 100,
            height: 50,
          },
        ],
        appState: {},
        files: {},
      },
    },
    {
      id: "drawing-2",
      title: "Child Drawing",
      parent_id: "drawing-1",
      is_public: false,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      content: {
        elements: [],
        appState: {},
        files: {},
      },
    },
  ]

  it("should export and import project cleanly (roundtrip test)", async () => {
    await repository.replaceAllDrawings(sampleDrawings)

    const exportedJson = await service.exportProject()
    expect(exportedJson).toContain('"format": "linkdraw-project"')
    expect(exportedJson).toContain('"version": 1')

    // Clear repository
    repository.clearAll()
    const emptyList = await repository.listDrawings()
    expect(emptyList).toHaveLength(0)

    // Import exported project
    const result = await service.importProject(exportedJson)
    expect(result.count).toBe(2)

    const importedDrawings = await repository.listDrawings()
    expect(importedDrawings).toHaveLength(2)
    expect(importedDrawings[0].id).toBe("drawing-1")
    expect(importedDrawings[1].id).toBe("drawing-2")
    expect(importedDrawings[1].parent_id).toBe("drawing-1")
  })

  it("should accept legacy '1.0.0' backup format", () => {
    const legacyBackup = JSON.stringify({
      version: "1.0.0",
      exportDate: "2026-01-01T00:00:00.000Z",
      drawings: sampleDrawings,
    })

    const validated = service.parseAndValidateBackup(legacyBackup)
    expect(validated).toHaveLength(2)
    expect(validated[0].id).toBe("drawing-1")
  })

  it("should accept legacy direct Drawing[] array format", () => {
    const arrayBackup = JSON.stringify(sampleDrawings)

    const validated = service.parseAndValidateBackup(arrayBackup)
    expect(validated).toHaveLength(2)
    expect(validated[1].id).toBe("drawing-2")
  })

  it("should throw on invalid JSON", () => {
    expect(() => service.parseAndValidateBackup("not-valid-json")).toThrow("Invalid JSON file")
  })

  it("should throw on unsupported version", () => {
    const invalidVersion = JSON.stringify({
      format: "linkdraw-project",
      version: 99,
      drawings: sampleDrawings,
    })

    expect(() => service.parseAndValidateBackup(invalidVersion)).toThrow(
      "Unsupported backup version"
    )
  })

  it("should throw on missing ID or invalid drawing structure", () => {
    const invalidDrawing = JSON.stringify({
      format: "linkdraw-project",
      version: 1,
      drawings: [
        {
          title: "No ID drawing",
          content: { elements: [] },
        },
      ],
    })

    expect(() => service.parseAndValidateBackup(invalidDrawing)).toThrow(
      "Drawing at index 0 is missing a valid ID"
    )
  })

  it("should throw on duplicate drawing IDs", () => {
    const duplicateIds = JSON.stringify({
      format: "linkdraw-project",
      version: 1,
      drawings: [
        { ...sampleDrawings[0], id: "same-id" },
        { ...sampleDrawings[1], id: "same-id" },
      ],
    })

    expect(() => service.parseAndValidateBackup(duplicateIds)).toThrow(
      "Duplicate drawing ID found: same-id"
    )
  })

  it("should throw on non-existent parent reference", () => {
    const missingParent = JSON.stringify({
      format: "linkdraw-project",
      version: 1,
      drawings: [
        {
          ...sampleDrawings[0],
          id: "drawing-orphan",
          parent_id: "non-existent-parent",
        },
      ],
    })

    expect(() => service.parseAndValidateBackup(missingParent)).toThrow(
      'Drawing "Root Drawing" references a missing parent (non-existent-parent)'
    )
  })

  it("should throw on circular parent references", () => {
    const circularDrawings: Drawing[] = [
      {
        ...sampleDrawings[0],
        id: "node-a",
        title: "Node A",
        parent_id: "node-b",
      },
      {
        ...sampleDrawings[1],
        id: "node-b",
        title: "Node B",
        parent_id: "node-a",
      },
    ]

    const circularBackup = JSON.stringify({
      format: "linkdraw-project",
      version: 1,
      drawings: circularDrawings,
    })

    expect(() => service.parseAndValidateBackup(circularBackup)).toThrow(
      'Circular parent reference detected involving drawing "Node A"'
    )
  })

  it("should create a recovery backup in sessionStorage", async () => {
    await repository.replaceAllDrawings(sampleDrawings)

    await service.createRecoveryBackup()
    const stored = sessionStorage.getItem("linkdraw:recovery-backup")

    expect(stored).not.toBeNull()
    expect(stored).toContain("drawing-1")
    expect(stored).toContain("drawing-2")
  })
})
