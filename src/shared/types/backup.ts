import type { Drawing } from "./drawing"

export interface LinkDrawProjectBackup {
  format: "linkdraw-project"
  version: 1
  exportedAt: string
  drawings: Drawing[]
}

export interface LegacyBackupFormat {
  version?: string
  exportDate?: string
  exportedAt?: string
  drawings: Drawing[]
}
