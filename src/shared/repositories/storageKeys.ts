/**
 * Centralized localStorage keys shared across repository implementations.
 *
 * Keeping these in one place avoids duplicated string literals between
 * LocalStorageRepository (the legacy engine) and the IndexedDB migration
 * path, which both need to agree on where the legacy drawings backup lives.
 */

/** Legacy drawings backup written by LocalStorageRepository, read by the migration. */
export const DRAWINGS_STORAGE_KEY = "linkdraw:drawings:v1"

/**
 * Persistent marker recording which storage engine is authoritative for this
 * browser profile. Once IndexedDB is marked authoritative, the app must never
 * silently fall back to the (potentially stale) localStorage backup again.
 */
export const STORAGE_ENGINE_KEY = "linkdraw:storage-engine"

export type StorageEngineName = "indexeddb" | "localstorage"

function isStorageEngineName(value: string | null): value is StorageEngineName {
  return value === "indexeddb" || value === "localstorage"
}

/**
 * Reads the persisted engine authority marker, if any.
 * Returns null when unset or when localStorage itself is unavailable.
 */
export function getPersistedStorageEngine(): StorageEngineName | null {
  if (typeof localStorage === "undefined") return null
  const value = localStorage.getItem(STORAGE_ENGINE_KEY)
  return isStorageEngineName(value) ? value : null
}

/**
 * Marks a storage engine as authoritative. This should only be called once
 * the engine has been fully opened/initialized and is ready to operate -
 * never speculatively.
 */
export function markStorageEngineAuthoritative(engine: StorageEngineName): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(STORAGE_ENGINE_KEY, engine)
}
