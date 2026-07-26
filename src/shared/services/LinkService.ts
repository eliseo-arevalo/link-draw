import type { ICanvasAdapter } from "@/shared/interfaces/ICanvasAdapter"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import { findDrawingLinks } from "@/shared/lib/drawing-links"
import { findInTree, getPathToNode, nodeExists } from "@/shared/lib/tree-utils"
import type {
  BacklinkInfo,
  DrawingLink,
  DrawingTreeNode,
  ExcalidrawContent,
} from "@/shared/types/drawing"
import { buildLinkGraph, detectCycle } from "./link/graph-algorithms"

export interface CircularReferenceResult {
  hasCircularReference: boolean
  path?: string[]
  message?: string
}

export class LinkService {
  private repository: IGraphRepository
  private canvas: ICanvasAdapter

  constructor(repository: IGraphRepository, canvas: ICanvasAdapter) {
    this.repository = repository
    this.canvas = canvas
  }

  extractLinksFromCanvas(): DrawingLink[] {
    return this.canvas.extractDrawingLinks()
  }

  async updateDrawingLinks(_drawingId: string): Promise<void> {
    // TODO: Implement when repository supports separate link storage
  }

  async getDrawingLinks(drawingId: string): Promise<DrawingLink[]> {
    const drawing = await this.repository.loadDrawing(drawingId)
    if (!drawing) {
      return []
    }
    return this.extractLinksFromContent(drawing.content)
  }

  private extractLinksFromContent(content: ExcalidrawContent): DrawingLink[] {
    // Extract links directly from content without mutating canvas state
    const elements = content.elements || []
    const linkInfos = findDrawingLinks(elements)

    return linkInfos.map((info) => ({
      elementId: info.elementId,
      targetDrawingId: info.drawingId,
      targetType: info.targetType,
    }))
  }

  async wouldCreateCircularReference(
    drawingId: string,
    newParentId: string | null
  ): Promise<CircularReferenceResult> {
    if (!newParentId) return { hasCircularReference: false }

    if (drawingId === newParentId) {
      return {
        hasCircularReference: true,
        path: [drawingId],
        message: "A drawing cannot be its own parent",
      }
    }

    const tree = await this.repository.getDrawingsTree()
    const isDescendant = this.isDescendantOf(tree, newParentId, drawingId)

    if (isDescendant) {
      const path = this.getCircularPath(tree, drawingId, newParentId)
      return {
        hasCircularReference: true,
        path,
        message: `Circular reference detected: ${path.join(" → ")}`,
      }
    }

    return { hasCircularReference: false }
  }

  async wouldCreateCircularLinkReference(
    sourceDrawingId: string,
    targetDrawingId: string
  ): Promise<CircularReferenceResult> {
    if (sourceDrawingId === targetDrawingId) {
      return {
        hasCircularReference: true,
        path: [sourceDrawingId],
        message: "A drawing cannot link to itself",
      }
    }

    const allLinks = await this.getAllLinks()
    const graph = buildLinkGraph(allLinks)

    if (!graph.has(sourceDrawingId)) {
      graph.set(sourceDrawingId, new Set())
    }
    graph.get(sourceDrawingId)?.add(targetDrawingId)

    const cycle = detectCycle(graph, sourceDrawingId)

    if (cycle) {
      return {
        hasCircularReference: true,
        path: cycle,
        message: `Circular link reference detected: ${cycle.join(" → ")}`,
      }
    }

    return { hasCircularReference: false }
  }

  async validateLinks(drawingId: string): Promise<string[]> {
    const links = await this.getDrawingLinks(drawingId)
    const validationResults = await Promise.all(
      links.map(async (link) => {
        const targetExists = await this.repository.exists(link.targetDrawingId)
        return targetExists ? null : link.targetDrawingId
      })
    )

    return validationResults.filter((targetId): targetId is string => targetId !== null)
  }

  async getBacklinks(drawingId: string): Promise<BacklinkInfo[]> {
    const allDrawings = await this.repository.listDrawings()
    const backlinks: BacklinkInfo[] = []

    for (const drawing of allDrawings) {
      if (drawing.id === drawingId) continue
      const links = this.extractLinksFromContent(drawing.content)
      for (const link of links) {
        if (link.targetDrawingId === drawingId) {
          backlinks.push({
            ...link,
            sourceDrawingId: drawing.id,
            sourceDrawingTitle: drawing.title || "Untitled",
          })
        }
      }
    }

    return backlinks
  }

  private isDescendantOf(
    tree: DrawingTreeNode[],
    potentialDescendant: string,
    ancestor: string
  ): boolean {
    const ancestorNode = findInTree(tree, (node) => node.id === ancestor)
    if (!ancestorNode) {
      return false
    }

    return nodeExists(ancestorNode.children || [], potentialDescendant)
  }

  private getCircularPath(
    tree: DrawingTreeNode[],
    drawingId: string,
    newParentId: string
  ): string[] {
    const pathToNewParent = getPathToNode(tree, newParentId)
    return [...pathToNewParent, drawingId]
  }

  private async getAllLinks(): Promise<Map<string, DrawingLink[]>> {
    const allDrawings = await this.repository.listDrawings()
    const linksMap = new Map<string, DrawingLink[]>()

    for (const drawing of allDrawings) {
      const links = this.extractLinksFromContent(drawing.content)
      linksMap.set(drawing.id, links)
    }

    return linksMap
  }
}
