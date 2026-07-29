import { EXAMPLE_DRAWINGS } from "@/shared/data/exampleDrawings"
import type { Drawing } from "@/shared/types/drawing"
import { validateNoCircularReference } from "../helpers/circular-validator"
import { DRAWINGS_STORAGE_KEY } from "../storageKeys"
import type { LinkDrawDatabase } from "./LinkDrawDatabase"

const LOCALSTORAGE_KEY = DRAWINGS_STORAGE_KEY

/** A non-empty string that parses to a valid Date. */
function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false
  return !Number.isNaN(new Date(value).getTime())
}

function isValidDrawingContent(content: unknown): content is Drawing["content"] {
  if (!content || typeof content !== "object") return false
  const c = content as Partial<Drawing["content"]>
  if (!Array.isArray(c.elements)) return false
  if (!c.appState || typeof c.appState !== "object") return false
  if (!c.files || typeof c.files !== "object") return false
  return true
}

function isValidParentId(parentId: unknown): parentId is Drawing["parent_id"] {
  if (parentId === null) return true
  return typeof parentId === "string" && parentId.trim().length > 0
}

export function isValidDrawingStructure(d: unknown): d is Drawing {
  if (!d || typeof d !== "object") return false
  const obj = d as Partial<Drawing>

  if (typeof obj.id !== "string" || !obj.id.trim()) return false
  if (typeof obj.title !== "string") return false
  if (!isValidDrawingContent(obj.content)) return false
  if (!isValidParentId(obj.parent_id)) return false
  if (typeof obj.is_public !== "boolean") return false
  if (!isValidDateString(obj.created_at)) return false
  if (!isValidDateString(obj.updated_at)) return false

  return true
}

export function validateLocalStorageDrawings(parsed: unknown[]): Drawing[] {
  const drawings: Drawing[] = []
  const seenIds = new Set<string>()

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i]
    if (!isValidDrawingStructure(item)) {
      throw new Error(`Invalid drawing structure at index ${i}`)
    }
    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate drawing ID found during migration: ${item.id}`)
    }
    seenIds.add(item.id)
    drawings.push(item)
  }

  const drawingMap = new Map(drawings.map((d) => [d.id, d]))
  for (const d of drawings) {
    if (d.parent_id && !drawingMap.has(d.parent_id)) {
      throw new Error(`Drawing "${d.title}" (${d.id}) references missing parent "${d.parent_id}"`)
    }
    if (d.parent_id) {
      validateNoCircularReference(d.id, d.parent_id, drawingMap)
    }
  }

  return drawings
}

export type MigrationResult =
  | { status: "none" }
  | { status: "valid"; drawings: Drawing[] }
  | { status: "invalid"; error: string }

export function readAndValidateLocalStorageDrawings(): MigrationResult {
  if (typeof localStorage === "undefined") {
    return { status: "none" }
  }

  const rawData = localStorage.getItem(LOCALSTORAGE_KEY)
  if (!rawData) {
    return { status: "none" }
  }

  try {
    const parsed = JSON.parse(rawData)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { status: "none" }
    }
    const drawings = validateLocalStorageDrawings(parsed)
    return { status: "valid", drawings }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.warn("[Migration] localStorage data validation failed:", msg)
    return { status: "invalid", error: msg }
  }
}

async function loadExampleDrawings(db: LinkDrawDatabase): Promise<void> {
  console.log("[Migration] First time use - loading example drawings into IndexedDB")
  const now = new Date().toISOString()
  const exampleDrawings = EXAMPLE_DRAWINGS.map((example) => ({
    ...example,
    is_public: false,
    created_at: now,
    updated_at: now,
  })) as unknown as Drawing[]

  await db.transaction("rw", [db.drawings, db.metadata], async () => {
    await db.drawings.bulkPut(exampleDrawings)
    await db.metadata.put({ key: "initialized", value: true })
    await db.metadata.put({ key: "onboarding_demo_eligible", value: true })
    await db.metadata.put({ key: "migrated_from_localstorage", value: true })
  })
}

export async function migrateFromLocalStorageIfNeeded(db: LinkDrawDatabase): Promise<void> {
  const migrationRecord = await db.metadata.get("migrated_from_localstorage")
  if (migrationRecord?.value) {
    return
  }

  const result = readAndValidateLocalStorageDrawings()

  if (result.status === "invalid") {
    console.warn(
      "[Migration] Skipping automatic migration due to validation failure:",
      result.error
    )
    return
  }

  if (result.status === "valid") {
    await db.transaction("rw", [db.drawings, db.metadata], async () => {
      await db.drawings.bulkPut(result.drawings)
      await db.metadata.put({ key: "migrated_from_localstorage", value: true })
      await db.metadata.put({ key: "initialized", value: true })
      await db.metadata.put({ key: "onboarding_demo_eligible", value: true })
    })

    const count = await db.drawings.count()
    if (count < result.drawings.length) {
      console.warn(
        `[Migration] Expected ${result.drawings.length} drawings, but found ${count} in IndexedDB`
      )
    }
    console.log(
      `[Migration] Successfully migrated ${result.drawings.length} drawings from localStorage to IndexedDB.`
    )
    return
  }

  const initRecord = await db.metadata.get("initialized")
  const isInitialized = Boolean(initRecord?.value)
  const count = await db.drawings.count()

  if (!isInitialized && count === 0) {
    await loadExampleDrawings(db)
  } else {
    await db.metadata.put({ key: "migrated_from_localstorage", value: true })
  }
}
