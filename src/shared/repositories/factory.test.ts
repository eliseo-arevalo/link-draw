import "fake-indexeddb/auto"
import { IDBFactory } from "fake-indexeddb"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createGraphRepository,
  LazyGraphRepository,
  StorageEngineUnavailableError,
} from "./factory"
import { LinkDrawDatabase } from "./indexedDB/LinkDrawDatabase"
import { DRAWINGS_STORAGE_KEY, STORAGE_ENGINE_KEY } from "./storageKeys"

describe("Repository Factory", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
    // Fresh, isolated fake IndexedDB per test: no databases or open Dexie
    // connections leak between tests (recommended fake-indexeddb pattern).
    globalThis.indexedDB = new IDBFactory()
  })

  it("should return a LazyGraphRepository wrapper", () => {
    const repo = createGraphRepository()
    expect(repo).toBeInstanceOf(LazyGraphRepository)
  })

  describe("first use (no engine authoritative yet)", () => {
    it("uses LocalStorageRepository when indexedDB is undefined, without persisting an engine marker", async () => {
      const originalIndexedDB = globalThis.indexedDB
      // @ts-expect-error - simulate an environment without IndexedDB support
      delete globalThis.indexedDB

      const repo = new LazyGraphRepository()
      const id = await repo.createDrawing("Fallback Test")
      expect(id).toBeDefined()
      expect(await repo.exists(id)).toBe(true)
      expect(localStorage.getItem(STORAGE_ENGINE_KEY)).toBeNull()

      globalThis.indexedDB = originalIndexedDB
    })

    it("selects IndexedDB when available and persists it as the authoritative engine", async () => {
      const repo = new LazyGraphRepository()
      const id = await repo.createDrawing("IndexedDB Selection Test")

      expect(id).toBeDefined()
      expect(await repo.exists(id)).toBe(true)
      expect(localStorage.getItem(STORAGE_ENGINE_KEY)).toBe("indexeddb")
    })

    it("falls back to LocalStorageRepository when IndexedDB genuinely fails to open, and does not persist a marker", async () => {
      // Simulate a real open() failure (e.g. blocked/corrupt database) rather
      // than relying on indexedDB being undefined in the test environment.
      vi.spyOn(LinkDrawDatabase.prototype, "open").mockRejectedValue(new Error("Blocked IndexedDB"))

      const repo = new LazyGraphRepository()
      const id = await repo.createDrawing("Blocked Fallback Test")

      expect(id).toBeDefined()
      expect(await repo.exists(id)).toBe(true)
      expect(localStorage.getItem(STORAGE_ENGINE_KEY)).toBeNull()
    })
  })

  describe("IndexedDB already authoritative", () => {
    it("rejects operations and does not fall back to localStorage when the authoritative IndexedDB fails to open", async () => {
      localStorage.setItem(STORAGE_ENGINE_KEY, "indexeddb")
      vi.spyOn(LinkDrawDatabase.prototype, "open").mockRejectedValue(new Error("Blocked IndexedDB"))

      const repo = new LazyGraphRepository()

      await expect(repo.createDrawing("Should never be created")).rejects.toThrow(
        StorageEngineUnavailableError
      )
      // The error must be stable/observable through public IGraphRepository
      // operations, not just the first one.
      await expect(repo.listDrawings()).rejects.toThrow(StorageEngineUnavailableError)
    })

    it("does not read or write the old localStorage backup when refusing to fall back", async () => {
      localStorage.setItem(STORAGE_ENGINE_KEY, "indexeddb")
      localStorage.setItem(
        DRAWINGS_STORAGE_KEY,
        JSON.stringify([{ id: "stale", title: "Stale drawing" }])
      )
      vi.spyOn(LinkDrawDatabase.prototype, "open").mockRejectedValue(new Error("Blocked IndexedDB"))

      const repo = new LazyGraphRepository()
      await expect(repo.exists("stale")).rejects.toThrow(StorageEngineUnavailableError)

      // The stale backup must remain byte-for-byte untouched.
      expect(localStorage.getItem(DRAWINGS_STORAGE_KEY)).toBe(
        JSON.stringify([{ id: "stale", title: "Stale drawing" }])
      )
      expect(localStorage.getItem(STORAGE_ENGINE_KEY)).toBe("indexeddb")
    })

    it("rejects operations when indexedDB is entirely undefined despite being previously authoritative", async () => {
      localStorage.setItem(STORAGE_ENGINE_KEY, "indexeddb")
      const originalIndexedDB = globalThis.indexedDB
      // @ts-expect-error - simulate IndexedDB support disappearing entirely
      delete globalThis.indexedDB

      const repo = new LazyGraphRepository()
      await expect(repo.exists("whatever")).rejects.toThrow(StorageEngineUnavailableError)
      expect(localStorage.getItem(DRAWINGS_STORAGE_KEY)).toBeNull()

      globalThis.indexedDB = originalIndexedDB
    })
  })
})
