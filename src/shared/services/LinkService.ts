import type { ICanvasAdapter } from "@/shared/interfaces/ICanvasAdapter"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import { findInTree, getPathToNode, nodeExists } from "@/shared/lib/tree-utils"
import type { DrawingLink, DrawingTreeNode, ExcalidrawContent } from "@/shared/types/drawing"
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
    // Use the same logic as ExcalidrawAdapter.extractDrawingLinks but stateless
    const elements = content.elements || []
    const links: DrawingLink[] = []

    for (const element of elements) {
      if (element.link) {
        const match = element.link.match(/^excaligraph:\/\/drawing\/([a-f0-9-]+)$/i)
        if (match) {
          links.push({
            elementId: element.id,
            targetDrawingId: match[1],
            targetType: "drawing",
          })
        }
      }
    }

    return links
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
    const brokenLinks: string[] = []

    for (const link of links) {
      const targetExists = await this.repository.exists(link.targetDrawingId)
      if (!targetExists) {
        brokenLinks.push(link.targetDrawingId)
      }
    }

    return brokenLinks
  }

  async getBacklinks(drawingId: string): Promise<DrawingLink[]> {
    const allDrawings = await this.repository.listDrawings()
    const backlinks: DrawingLink[] = []

    for (const drawing of allDrawings) {
      const links = this.extractLinksFromContent(drawing.content)
      const linksToTarget = links.filter((link: DrawingLink) => link.targetDrawingId === drawingId)
      backlinks.push(...linksToTarget)
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
