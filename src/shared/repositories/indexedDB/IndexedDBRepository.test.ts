import "fake-indexeddb/auto"
import Dexie from "dexie"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { Drawing } from "@/shared/types/drawing"
import { runGraphRepositoryContractTests } from "../contract/repositoryContractTests"
import { IndexedDBRepository } from "./IndexedDBRepository"
import { LinkDrawDatabase } from "./LinkDrawDatabase"
import { migrateFromLocalStorageIfNeeded, validateLocalStorageDrawings } from "./migration"

describe("IndexedDBRepository Contract & Migration Tests", () => {
  let testDbName = "LinkDrawTestDB"
  let counter = 0
  let activeRepo: IndexedDBRepository | null = null

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    counter++
    testDbName = `LinkDrawTestDB_${Date.now()}_${counter}`
  })

  afterEach(async () => {
    if (activeRepo) {
      await activeRepo.close()
      activeRepo = null
    }
    await Dexie.delete(testDbName)
  })

  runGraphRepositoryContractTests(async () => {
    if (activeRepo) {
      await activeRepo.close()
    }
    activeRepo = new IndexedDBRepository(testDbName)
    await activeRepo.initForFactory()
    return activeRepo
  })

  describe("Specific Migration, Concurrency & Atomicity Tests", () => {
    it("should migrate valid drawings from localStorage to IndexedDB automatically", async () => {
      const sampleLocalStorageData: Drawing[] = [
        {
          id: "migrated-1",
          title: "Migrated Drawing 1",
          parent_id: null,
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
      ]

      localStorage.setItem("linkdraw:drawings:v1", JSON.stringify(sampleLocalStorageData))

      const repo = new IndexedDBRepository(testDbName)
      activeRepo = repo
      const loaded = await repo.loadDrawing("migrated-1")

      expect(loaded).not.toBeNull()
      expect(loaded?.title).toBe("Migrated Drawing 1")
      expect(localStorage.getItem("linkdraw:drawings:v1")).not.toBeNull()
    })

    it("should reject migration when localStorage contains corrupt or incomplete structures", async () => {
      const corruptData = [{ id: "incomplete-only-id" }]
      localStorage.setItem("linkdraw:drawings:v1", JSON.stringify(corruptData))

      const db = new LinkDrawDatabase(testDbName)
      await db.open()

      await migrateFromLocalStorageIfNeeded(db)

      // Ensure corrupt item was not inserted
      const item = await db.drawings.get("incomplete-only-id")
      expect(item).toBeUndefined()

      // Ensure migration was NOT marked as completed
      const migrationRecord = await db.metadata.get("migrated_from_localstorage")
      expect(migrationRecord?.value).toBeUndefined()

      db.close()
    })

    it("should reject migration when localStorage contains duplicate IDs", () => {
      const duplicateData = [
        {
          id: "dup-1",
          title: "Drawing 1",
          parent_id: null,
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
        {
          id: "dup-1",
          title: "Drawing 2",
          parent_id: null,
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
      ]

      expect(() => validateLocalStorageDrawings(duplicateData)).toThrow(
        "Duplicate drawing ID found during migration: dup-1"
      )
    })

    it("should reject migration when localStorage contains a missing parent reference", () => {
      const missingParentData = [
        {
          id: "child-1",
          title: "Child",
          parent_id: "missing-parent-id",
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
      ]

      expect(() => validateLocalStorageDrawings(missingParentData)).toThrow(
        'Drawing "Child" (child-1) references missing parent "missing-parent-id"'
      )
    })

    it("should reject migration when localStorage contains an actual parent cycle (A -> B -> A)", () => {
      const cyclicData = [
        {
          id: "node-a",
          title: "Node A",
          parent_id: "node-b",
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
        {
          id: "node-b",
          title: "Node B",
          parent_id: "node-a",
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
      ]

      // Both parents exist, so this must fail on cycle detection, not on a
      // "missing parent" check - proving the cycle path is actually exercised.
      expect(() => validateLocalStorageDrawings(cyclicData)).toThrow(
        "This would create a circular reference"
      )
    })

    it("should reject migration when created_at is missing or invalid", () => {
      const missingCreatedAt = [
        {
          id: "bad-created-1",
          title: "Bad",
          parent_id: null,
          is_public: false,
          created_at: "",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
      ]
      expect(() => validateLocalStorageDrawings(missingCreatedAt)).toThrow(
        "Invalid drawing structure at index 0"
      )

      const invalidCreatedAt = [
        {
          id: "bad-created-2",
          title: "Bad",
          parent_id: null,
          is_public: false,
          created_at: "not-a-date",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
      ]
      expect(() => validateLocalStorageDrawings(invalidCreatedAt)).toThrow(
        "Invalid drawing structure at index 0"
      )
    })

    it("should reject migration when updated_at is missing or invalid", () => {
      const missingUpdatedAt = [
        {
          id: "bad-updated-1",
          title: "Bad",
          parent_id: null,
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "",
          content: { elements: [], appState: {}, files: {} },
        },
      ]
      expect(() => validateLocalStorageDrawings(missingUpdatedAt)).toThrow(
        "Invalid drawing structure at index 0"
      )

      const invalidUpdatedAt = [
        {
          id: "bad-updated-2",
          title: "Bad",
          parent_id: null,
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "not-a-date",
          content: { elements: [], appState: {}, files: {} },
        },
      ]
      expect(() => validateLocalStorageDrawings(invalidUpdatedAt)).toThrow(
        "Invalid drawing structure at index 0"
      )
    })

    it("should reject migration when parent_id is an empty string", () => {
      const emptyParentId = [
        {
          id: "bad-parent-1",
          title: "Bad",
          parent_id: "",
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
      ]
      expect(() => validateLocalStorageDrawings(emptyParentId)).toThrow(
        "Invalid drawing structure at index 0"
      )
    })

    it("should leave IndexedDB and its metadata untouched when validation fails", async () => {
      const invalidData = [
        {
          id: "will-fail",
          title: "Will fail",
          parent_id: null,
          is_public: false,
          created_at: "not-a-date",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
      ]
      localStorage.setItem("linkdraw:drawings:v1", JSON.stringify(invalidData))

      const db = new LinkDrawDatabase(testDbName)
      await db.open()

      await migrateFromLocalStorageIfNeeded(db)

      expect(await db.drawings.count()).toBe(0)
      expect(await db.drawings.get("will-fail")).toBeUndefined()
      const migrationRecord = await db.metadata.get("migrated_from_localstorage")
      expect(migrationRecord?.value).toBeUndefined()
      // The original (invalid) localStorage backup must be preserved as-is.
      expect(localStorage.getItem("linkdraw:drawings:v1")).toBe(JSON.stringify(invalidData))

      db.close()
    })

    it("should be idempotent when running migration multiple times", async () => {
      const db = new LinkDrawDatabase(testDbName)
      await db.open()

      const sampleData: Drawing[] = [
        {
          id: "idem-1",
          title: "Idempotent Drawing",
          parent_id: null,
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
      ]

      localStorage.setItem("linkdraw:drawings:v1", JSON.stringify(sampleData))

      await migrateFromLocalStorageIfNeeded(db)
      expect(await db.drawings.count()).toBe(1)

      await migrateFromLocalStorageIfNeeded(db)
      expect(await db.drawings.count()).toBe(1)

      db.close()
    })

    it("should preserve every field when saveDrawing (content only), updateDrawingTitle, and togglePublic run truly concurrently", async () => {
      const repo = new IndexedDBRepository(testDbName)
      activeRepo = repo

      const id = await repo.createDrawing("Concurrent Initial")

      // Each operation touches a DIFFERENT field. If any implementation did a
      // bare get-then-put outside of a single atomic transaction, one of the
      // three writes would silently clobber the others with a stale read -
      // this is exactly what this test must catch (see engram note on how
      // this was verified against a naive, non-transactional implementation).
      await Promise.all([
        repo.saveDrawing(id, {
          content: {
            elements: [{ id: "e1", type: "rectangle", x: 5, y: 5, width: 20, height: 20 }],
            appState: {},
            files: {},
          },
        }),
        repo.updateDrawingTitle(id, "Renamed Concurrently"),
        repo.togglePublic(id, true),
      ])

      const finalDrawing = await repo.loadDrawing(id)
      expect(finalDrawing?.title).toBe("Renamed Concurrently")
      expect(finalDrawing?.is_public).toBe(true)
      expect(finalDrawing?.content.elements).toHaveLength(1)
      expect(finalDrawing?.content.elements[0]).toMatchObject({ id: "e1" })
    })

    it("should execute replaceAllDrawings atomically via public method", async () => {
      const repo = new IndexedDBRepository(testDbName)
      activeRepo = repo

      await repo.createDrawing("Original 1")
      await repo.createDrawing("Original 2")

      const replaceSet: Drawing[] = [
        {
          id: "rep-1",
          title: "Replacement 1",
          parent_id: null,
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
      ]

      await repo.replaceAllDrawings(replaceSet)
      const list = await repo.listDrawings()
      expect(list).toHaveLength(1)
      expect(list[0].id).toBe("rep-1")
    })

    it("should keep all original drawings and persist no partial replacement when replaceAllDrawings fails mid-bulkPut", async () => {
      const repo = new IndexedDBRepository(testDbName)
      activeRepo = repo

      const original1 = await repo.createDrawing("Original A")
      const original2 = await repo.createDrawing("Original B")
      const idsBeforeReplace = (await repo.listDrawings()).map((d) => d.id).sort()

      const replaceSet: Drawing[] = [
        {
          id: "good-replacement",
          title: "Good Replacement",
          parent_id: null,
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: { elements: [], appState: {}, files: {} },
        },
        {
          id: "bad-replacement",
          title: "Bad Replacement",
          parent_id: null,
          is_public: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          content: {
            elements: [],
            // A function is not structured-clonable. IndexedDB rejects the
            // put with a DataCloneError, simulating a real failure partway
            // through bulkPut (this item is written after "good-replacement").
            appState: { onSomething: () => {} } as unknown as Drawing["content"]["appState"],
            files: {},
          },
        },
      ]

      await expect(repo.replaceAllDrawings(replaceSet)).rejects.toThrow()

      // All original drawings must have survived the failed transaction.
      expect(await repo.exists(original1)).toBe(true)
      expect(await repo.exists(original2)).toBe(true)

      // Nothing from the (partially applied) replacement set may persist,
      // including the item that would have succeeded on its own.
      expect(await repo.exists("good-replacement")).toBe(false)
      expect(await repo.exists("bad-replacement")).toBe(false)

      const idsAfterFailure = (await repo.listDrawings()).map((d) => d.id).sort()
      expect(idsAfterFailure).toEqual(idsBeforeReplace)
    })
  })
})
