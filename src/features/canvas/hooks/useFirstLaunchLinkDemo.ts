import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { useEffect, useRef, useState } from "react"
import type { ICanvasAdapter } from "@/shared/interfaces/ICanvasAdapter"
import type { IGraphRepository } from "@/shared/interfaces/IGraphRepository"
import { createDrawingLink } from "@/shared/lib/drawing-links"

const DEMO_COMPLETED_KEY = "linkdraw:onboarding-link-demo:v1"
const DEMO_ELIGIBLE_KEY = "linkdraw:onboarding-link-demo:eligible"
const DEMO_TARGET_TITLE = "Welcome to Link Draw"
const DEMO_TEXT = "[[Welcome"
const CURSOR_ENTRY_DURATION = 1050
const TYPE_START_DELAY = 1200
const TYPE_INTERVAL = 180
const NAVIGATION_CURSOR_DURATION = 1500

export type LinkDemoStage = "preparing" | "typing" | "linking" | "navigating" | "complete"
export type LinkDemoCursorMode = "compose" | "navigate"

export interface LinkDemoCursor {
  mode: LinkDemoCursorMode
  x: number
  y: number
  viewportWidth: number
  viewportHeight: number
}

export interface LinkDemoState {
  stage: LinkDemoStage
  message: string
  suggestionIndex?: number
  cursor?: LinkDemoCursor
}

interface UseFirstLaunchLinkDemoParams {
  api: ExcalidrawImperativeAPI | null
  adapter: ICanvasAdapter
  repository: IGraphRepository
  onActivateDrawing: (id: string) => void
}

export function useFirstLaunchLinkDemo({
  api,
  adapter,
  repository,
  onActivateDrawing,
}: UseFirstLaunchLinkDemoParams) {
  const startedRef = useRef(false)
  const [demo, setDemo] = useState<LinkDemoState | null>(null)

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
        const initialAppState = api.getAppState()
        const initialZoom = initialAppState.zoom.value
        setDemo({
          stage: "preparing",
          message: "Moving the cursor into place",
          cursor: {
            mode: "compose",
            x: initialAppState.width / 2 - 140 * initialZoom,
            y: initialAppState.height / 2,
            viewportWidth: initialAppState.width,
            viewportHeight: initialAppState.height,
          },
        })

        const [{ convertToExcalidrawElements, sceneCoordsToViewportCoords }, drawings] =
          await Promise.all([
            import("@excalidraw/excalidraw"),
            repository.listDrawings(),
          ])
        const targetDrawing = drawings.find((drawing) => drawing.title === DEMO_TARGET_TITLE)
        const sourceDrawing = drawings.find((drawing) => drawing.title === "Project brief")
        if (!targetDrawing || !sourceDrawing) {
          throw new Error("The first-launch demo drawings are unavailable")
        }

        const sourceId = sourceDrawing.id
        const targetId = targetDrawing.id
        if (cancelled) return

        onActivateDrawing(sourceId)
        schedule(() => {
          setDemo({ stage: "typing", message: "Writing a wiki link" })
        }, CURSOR_ENTRY_DURATION)

        const getTextPosition = () => {
          const appState = api.getAppState()
          const zoom = appState.zoom.value
          return {
            x: (appState.width / 2 - appState.scrollX) / zoom - 140,
            y: (appState.height / 2 - appState.scrollY) / zoom,
          }
        }

        const getCursorAtScenePoint = (
          mode: LinkDemoCursorMode,
          sceneX: number,
          sceneY: number
        ): LinkDemoCursor => {
          const appState = api.getAppState()
          const viewportPoint = sceneCoordsToViewportCoords({ sceneX, sceneY }, appState)
          return {
            mode,
            x: viewportPoint.x - appState.offsetLeft,
            y: viewportPoint.y - appState.offsetTop,
            viewportWidth: appState.width,
            viewportHeight: appState.height,
          }
        }

        for (let index = 1; index <= DEMO_TEXT.length; index += 1) {
          schedule(() => {
            if (cancelled) return
            const { x, y } = getTextPosition()
            api.updateScene({
              elements: convertToExcalidrawElements([
                {
                  type: "text",
                  x,
                  y,
                  text: DEMO_TEXT.slice(0, index),
                  fontSize: 28,
                  strokeColor: "#4338ca",
                },
              ]),
            })
          }, TYPE_START_DELAY + index * TYPE_INTERVAL)
        }

        const linkingDelay =
          TYPE_START_DELAY + (DEMO_TEXT.length + 1) * TYPE_INTERVAL + 900
        schedule(() => {
          if (!cancelled) {
            setDemo({ stage: "linking", message: "Choosing a linked drawing", suggestionIndex: 0 })
          }
        }, linkingDelay)

        schedule(() => {
          if (!cancelled) {
            setDemo({ stage: "linking", message: "Moving to the next suggestion", suggestionIndex: 1 })
          }
        }, linkingDelay + 1000)

        schedule(() => {
          if (cancelled) return
          const { x, y } = getTextPosition()
          const elements = convertToExcalidrawElements([
            {
              type: "text",
              x,
              y,
              text: DEMO_TARGET_TITLE,
              fontSize: 28,
              strokeColor: "#4338ca",
            },
          ])
          const elementId = elements[0]?.id
          api.updateScene({ elements })
          if (elementId) {
            adapter.setElementLink(elementId, createDrawingLink(targetId))
          }

          const element =
            api.getSceneElements().find((sceneElement) => sceneElement.id === elementId) ??
            elements[0]
          const appState = api.getAppState()
          const zoom = appState.zoom.value
          const cursor = element
            ? getCursorAtScenePoint(
                "navigate",
                element.x + element.width + 8 / zoom,
                element.y - 8 / zoom
              )
            : undefined
          setDemo({
            stage: "navigating",
            message: "Clicking Excalidraw's navigation arrow",
            cursor,
          })
          localStorage.setItem(DEMO_COMPLETED_KEY, "true")
          localStorage.removeItem(DEMO_ELIGIBLE_KEY)
          schedule(() => {
            if (cancelled) return
            onActivateDrawing(targetId)
            setDemo({ stage: "complete", message: "You arrived at the linked drawing" })
            schedule(() => setDemo(null), 1800)
          }, NAVIGATION_CURSOR_DURATION)
        }, linkingDelay + 2200)
      } catch (error) {
        console.error("Failed to run first-launch link demo:", error)
        localStorage.setItem(DEMO_COMPLETED_KEY, "true")
        localStorage.removeItem(DEMO_ELIGIBLE_KEY)
        setDemo(null)
      }
    }

    runDemo()

    return () => {
      cancelled = true
      timers.forEach((timer) => {
        clearTimeout(timer)
      })
    }
  }, [api, adapter, repository, onActivateDrawing])

  return demo
}
