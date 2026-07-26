import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import type { LinkDrawProjectBackup } from "@/shared/types/backup"
import type { Drawing } from "@/shared/types/drawing"

export class ProjectTransferService {
  private repository: IGraphRepository

  constructor(repository: IGraphRepository) {
    this.repository = repository
  }

  /**
   * Export the complete project as a formatted JSON backup string
   */
  async exportProject(): Promise<string> {
    const drawings = await this.repository.listDrawings()
    const backup: LinkDrawProjectBackup = {
      format: "linkdraw-project",
      version: 1,
      exportedAt: new Date().toISOString(),
      drawings,
    }
    return JSON.stringify(backup, null, 2)
  }

  /**
   * Parse and validate a JSON backup string without modifying storage
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Validation requires multi-step structural and graph checking
  parseAndValidateBackup(jsonData: string): Drawing[] {
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonData)
    } catch {
      throw new Error("Invalid JSON file")
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid backup format")
    }

    let drawings: Drawing[]

    // Handle new unified format
    if ("format" in parsed && (parsed as Record<string, unknown>).format === "linkdraw-project") {
      const backup = parsed as Partial<LinkDrawProjectBackup>
      if (backup.version !== 1) {
        throw new Error("Unsupported backup version")
      }
      if (!Array.isArray(backup.drawings)) {
        throw new Error("Invalid backup format: drawings array missing")
      }
      drawings = backup.drawings
    } else if (
      "drawings" in parsed &&
      Array.isArray((parsed as Record<string, unknown>).drawings)
    ) {
      // Handle legacy object format (version "1.0.0")
      drawings = (parsed as { drawings: Drawing[] }).drawings
    } else if (Array.isArray(parsed)) {
      // Handle legacy direct Drawing[] array format
      drawings = parsed as Drawing[]
    } else {
      throw new Error("Invalid backup format")
    }

    // Validate individual drawing structure
    const idSet = new Set<string>()
    for (let i = 0; i < drawings.length; i++) {
      const d = drawings[i]
      if (!d || typeof d !== "object") {
        throw new Error(`Invalid drawing entry at index ${i}`)
      }
      if (typeof d.id !== "string" || !d.id.trim()) {
        throw new Error(`Drawing at index ${i} is missing a valid ID`)
      }
      if (typeof d.title !== "string") {
        throw new Error(`Drawing ${d.id} is missing a title`)
      }
      if (!d.content || typeof d.content !== "object" || !Array.isArray(d.content.elements)) {
        throw new Error(`Drawing "${d.title}" (${d.id}) has invalid content structure`)
      }

      if (idSet.has(d.id)) {
        throw new Error(`Duplicate drawing ID found: ${d.id}`)
      }
      idSet.add(d.id)
    }

    // Map drawings by ID for parent checks
    const drawingMap = new Map<string, Drawing>(drawings.map((d) => [d.id, d]))

    // Validate missing parent references and circular parent references
    for (const d of drawings) {
      if (d.parent_id) {
        if (!drawingMap.has(d.parent_id)) {
          throw new Error(`Drawing "${d.title}" references a missing parent (${d.parent_id})`)
        }

        // Circular reference check
        const visited = new Set<string>([d.id])
        let currParentId: string | null = d.parent_id
        while (currParentId) {
          if (visited.has(currParentId)) {
            throw new Error(`Circular parent reference detected involving drawing "${d.title}"`)
          }
          visited.add(currParentId)
          const parentObj = drawingMap.get(currParentId)
          currParentId = parentObj?.parent_id ?? null
        }
      }
    }

    return drawings
  }

  /**
   * Validate and replace all project drawings with the provided backup
   */
  async importProject(jsonData: string): Promise<{ count: number }> {
    const drawings = this.parseAndValidateBackup(jsonData)
    await this.repository.replaceAllDrawings(drawings)
    return { count: drawings.length }
  }

  /**
   * Save a temporary recovery backup in sessionStorage before replacing drawings
   */
  async createRecoveryBackup(): Promise<string> {
    try {
      const drawings = await this.repository.listDrawings()
      const backup: LinkDrawProjectBackup = {
        format: "linkdraw-project",
        version: 1,
        exportedAt: new Date().toISOString(),
        drawings,
      }
      const jsonStr = JSON.stringify(backup)
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("linkdraw:recovery-backup", jsonStr)
      }
      return jsonStr
    } catch (err) {
      console.warn("Failed to save recovery backup in sessionStorage:", err)
      return ""
    }
  }
}
