import Dexie, { type Table } from "dexie"
import type { Drawing } from "@/shared/types/drawing"

export interface MetadataRecord {
  key: string
  value: unknown
}

export class LinkDrawDatabase extends Dexie {
  drawings!: Table<Drawing, string>
  metadata!: Table<MetadataRecord, string>

  constructor(dbName = "LinkDrawDB") {
    super(dbName)
    this.version(1).stores({
      drawings: "&id, parent_id, updated_at, created_at",
      metadata: "&key",
    })
  }
}
