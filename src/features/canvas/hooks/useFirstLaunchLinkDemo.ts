import { convertToExcalidrawElements } from "@excalidraw/excalidraw"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { useEffect, useRef, useState } from "react"
import type { ICanvasAdapter } from "@/shared/interfaces/ICanvasAdapter"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import { createDrawingLink } from "@/shared/lib/drawing-links"
import type { DrawingTreeNode } from "@/shared/types/drawing"

const DEMO_COMPLETED_KEY = "linkdraw:onboarding-link-demo:v1"
const DEMO_ELIGIBLE_KEY = "linkdraw:onboarding-link-demo:eligible"
const DEMO_TEXT = "Open the project brief"

interface UseFirstLaunchLinkDemoParams {
  api: ExcalidrawImperativeAPI | null
  adapter: ICanvasAdapter
  repository: IGraphRepository
  onActivateDrawing: (id: string) => void
  onTreeUpdated: (tree: DrawingTreeNode[]) => void
}

export function useFirstLaunchLinkDemo({
  api,
  adapter,
  repository,
  onActivateDrawing,
  onTreeUpdated,
}: UseFirstLaunchLinkDemoParams) {
  const startedRef = useRef(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (
      !api ||
      startedRef.current ||
      localStorage.getItem(DEMO_COMPLETED_KEY) ||
      localStorage.getItem(DEMO_ELIGIBLE_KEY) !== "true"
    ) {
      return
    }

    startedRef.current = true
    let cancelled = false
    const timers: number[] = []
    const schedule = (callback: () => void, delay: number) => {
      timers.push(window.setTimeout(callback, delay))
    }

    const runDemo = async () => {
      try {
        setMessage("Creating a link demo…")
        const sourceId = await repository.createDrawing("Welcome to LinkDraw", null)
        const targetId = await repository.createDrawing("Project brief", null)
        if (cancelled) return

        onTreeUpdated(await repository.getDrawingsTree())
        onActivateDrawing(sourceId)
        schedule(() => setMessage("Writing a note…"), 700)

        for (let index = 1; index <= DEMO_TEXT.length; index += 1) {
          schedule(() => {
            if (cancelled) return
            api.updateScene({
              elements: convertToExcalidrawElements([
                {
                  type: "text",
                  x: 180,
                  y: 180,
                  text: DEMO_TEXT.slice(0, index),
                  fontSize: 28,
                  strokeColor: "#4338ca",
                },
              ]),
            })
          }, 950 + index * 45)
        }

        schedule(() => {
          if (cancelled) return
          const elements = convertToExcalidrawElements([
            {
              type: "text",
              x: 180,
              y: 180,
              text: DEMO_TEXT,
              fontSize: 28,
              strokeColor: "#4338ca",
            },
          ])
          const elementId = elements[0]?.id
          api.updateScene({ elements })
          if (elementId) {
            adapter.setElementLink(elementId, createDrawingLink(targetId))
          }
          setMessage("Linked to “Project brief”")
          localStorage.setItem(DEMO_COMPLETED_KEY, "true")
          localStorage.removeItem(DEMO_ELIGIBLE_KEY)
          schedule(() => setMessage(null), 2600)
        }, 950 + (DEMO_TEXT.length + 1) * 45)
      } catch (error) {
        console.error("Failed to run first-launch link demo:", error)
        localStorage.setItem(DEMO_COMPLETED_KEY, "true")
        localStorage.removeItem(DEMO_ELIGIBLE_KEY)
        setMessage(null)
      }
    }

    runDemo()

    return () => {
      cancelled = true
      timers.forEach((timer) => {
        clearTimeout(timer)
      })
    }
  }, [api, adapter, repository, onActivateDrawing, onTreeUpdated])

  return message
}
