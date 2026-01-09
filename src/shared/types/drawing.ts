import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types"

/**
 * Excalidraw element type
 *
 * JUSTIFICATION FOR any[]:
 * - @excalidraw/excalidraw does not export ExcalidrawElement type
 * - Elements have dynamic properties based on element type (rectangle, arrow, text, etc.)
 * - Using any[] is the official approach until Excalidraw exports proper types
 * - This is isolated to this type definition and doesn't leak throughout the codebase
 *
 * @see https://github.com/excalidraw/excalidraw/issues/types
 */
// biome-ignore lint/suspicious/noExplicitAny: Excalidraw doesn't export element types
export type ExcalidrawElements = readonly any[]

export type ExcalidrawAppState = AppState

/**
 * Excalidraw drawing content
 */
export interface ExcalidrawContent {
  elements: ExcalidrawElements
  appState: Partial<ExcalidrawAppState>
  files: BinaryFiles
}

/**
 * Core drawing entity
 */
export interface Drawing {
  id: string
  title: string
  content: ExcalidrawContent
  parent_id: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

/**
 * Input for creating/updating drawings
 */
export interface DrawingInput {
  title?: string
  content: ExcalidrawContent
  parent_id?: string | null
  is_public?: boolean
}

/**
 * Drawing with children (tree structure)
 */
export interface DrawingTreeNode extends Drawing {
  children?: DrawingTreeNode[]
  metadata?: {
    matchesContent?: boolean
  }
}

/**
 * Link between drawings
 */
export interface DrawingLink {
  elementId: string
  targetDrawingId: string
  targetDrawingTitle?: string
  targetType: "drawing" | "element" | "frame"
}

/**
 * Drawing summary (for lists)
 */
export interface DrawingSummary {
  id: string
  title: string
  created_at: string
  updated_at: string
  parent_id: string | null
  is_public: boolean
  elementCount: number
  hasChildren: boolean
}
