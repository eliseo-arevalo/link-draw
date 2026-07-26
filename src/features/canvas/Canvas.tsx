import { viewportCoordsToSceneCoords } from "@excalidraw/excalidraw"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import { Icon } from "@/shared/components/Icon"
import { Toast } from "@/shared/components/Toast"
import { useAutoSave } from "@/shared/hooks/useAutoSave"
import { useIsMobile } from "@/shared/hooks/useIsMobile"
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts"
import {
  createDrawingLink,
  createElementLink,
  isDrawingLink,
  parseDrawingLink,
} from "@/shared/lib/drawing-links"
import { useServices } from "@/shared/providers/ServiceProvider"
import { useDrawingStore } from "@/shared/store/drawingStore"
import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"
import { DemoNavigationCursor } from "./components/DemoNavigationCursor"
import { DemoWikiSuggestion } from "./components/DemoWikiSuggestion"
import { DrawingLinkPreviewPopover } from "./components/DrawingLinkPreviewPopover"
import { DrawingPickerModal } from "./components/DrawingPickerModal"
import { GlobalWikiModal } from "./components/GlobalWikiModal"
import { LinkButton } from "./components/LinkButton"
import { LinkDemoGuide } from "./components/LinkDemoGuide"
import { useCanvasLoader } from "./hooks/useCanvasLoader"
import { useElementSelection } from "./hooks/useElementSelection"
import { useFirstLaunchLinkDemo } from "./hooks/useFirstLaunchLinkDemo"
import { useLinkNavigation } from "./hooks/useLinkNavigation"

const Excalidraw = lazy(() =>
  import(/* webpackChunkName: "excalidraw" */ "@excalidraw/excalidraw").then((mod) => ({
    default: mod.Excalidraw,
  }))
)

export function Canvas() {
  const { adapter, drawingService, repository } = useServices()
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null)
  const { activeDrawingId, setActiveDrawingId, isImporting } = useDrawingStore()
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [isWikiModalOpen, setIsWikiModalOpen] = useState(false)
  const [canvasError, setCanvasError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const excalidrawAPIRef = useRef(excalidrawAPI)
  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI
  }, [excalidrawAPI])

  const [wikiFilterText, setWikiFilterText] = useState("")

  useEffect(() => {
    const checkTextareaForWiki = () => {
      const textarea = document.querySelector<HTMLTextAreaElement>(".excalidraw-wysiwyg")
      if (!textarea) {
        setIsWikiModalOpen(false)
        return
      }

      const cursorPos = textarea.selectionStart ?? textarea.value.length
      const textBeforeCursor = textarea.value.slice(0, cursorPos)
      const lastWikiIdx = textBeforeCursor.lastIndexOf("[[")

      if (lastWikiIdx !== -1) {
        const queryText = textBeforeCursor.slice(lastWikiIdx + 2)
        if (!queryText.includes("\n")) {
          setWikiFilterText(queryText)
          setIsWikiModalOpen(true)
          return
        }
      }

      setIsWikiModalOpen(false)
    }

    document.addEventListener("input", checkTextareaForWiki, true)
    document.addEventListener("keyup", checkTextareaForWiki, true)
    document.addEventListener("selectionchange", checkTextareaForWiki, true)

    const interval = setInterval(checkTextareaForWiki, 150)

    return () => {
      document.removeEventListener("input", checkTextareaForWiki, true)
      document.removeEventListener("keyup", checkTextareaForWiki, true)
      document.removeEventListener("selectionchange", checkTextareaForWiki, true)
      clearInterval(interval)
    }
  }, [])

  const { selectedElementIds, hasSelection } = useElementSelection(excalidrawAPI, adapter)
  const { handleLinkOpen, errorMessage, clearError } = useLinkNavigation(adapter)

  const [previewTarget, setPreviewTarget] = useState<{
    drawingId: string
    position: { x: number; y: number }
  } | null>(null)

  useEffect(() => {
    if (selectedElementIds.length === 1) {
      const link = adapter.getElementLink(selectedElementIds[0])
      if (link && isDrawingLink(link)) {
        const parsed = parseDrawingLink(link)
        if (parsed) {
          setPreviewTarget((prev) => {
            if (prev?.drawingId === parsed.drawingId) return prev
            return {
              drawingId: parsed.drawingId,
              position: { x: window.innerWidth - 320, y: 120 },
            }
          })
          return
        }
      }
    }
    setPreviewTarget(null)
  }, [selectedElementIds, adapter])
  const demo = useFirstLaunchLinkDemo({
    api: excalidrawAPI,
    adapter,
    repository,
    onActivateDrawing: setActiveDrawingId,
  })
  const { saveAllCachedDrawings, clearCache } = useCanvasLoader(
    drawingService,
    repository,
    excalidrawAPI,
    adapter
  )

  const saveAllRef = useRef(saveAllCachedDrawings)
  useEffect(() => {
    saveAllRef.current = saveAllCachedDrawings
  }, [saveAllCachedDrawings])

  const { triggerSave, forceSave, cancelSave } = useAutoSave(
    async () => {
      if (!activeDrawingId || isImporting) return
      console.log(`[Canvas] 💾 SAVING drawing ${activeDrawingId.slice(0, 8)}`)
      // Guardar cache primero
      await saveAllRef.current()
      // Luego guardar el actual
      await drawingService.saveCurrentDrawing(activeDrawingId)
    },
    {
      delay: 500,
      enabled: !!activeDrawingId && !isImporting,
      onSaveSuccess: () => console.log("Auto-saved"),
      onSaveError: (error) => console.error("Auto-save failed:", error),
    }
  )

  useEffect(() => {
    if (isImporting) {
      console.log("[Canvas] Importing state active, canceling pending saves & clearing cache")
      cancelSave()
      clearCache()
    }
  }, [isImporting, cancelSave, clearCache])

  const triggerSaveRef = useRef(triggerSave)
  useEffect(() => {
    triggerSaveRef.current = triggerSave
  }, [triggerSave])

  // Center content only on first load (when appState is empty in storage)
  useEffect(() => {
    if (!excalidrawAPI || !activeDrawingId) return

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Centering logic requires multiple calculations
    const centerIfNeeded = async () => {
      try {
        // Load drawing from storage
        const drawing = await repository.loadDrawing(activeDrawingId)
        const storedAppState = drawing?.content?.appState

        // Only center if appState is empty (fresh from examples)
        const shouldCenter = !storedAppState || Object.keys(storedAppState).length === 0

        console.log(
          `[Canvas] 🔍 Drawing ${activeDrawingId.slice(0, 8)} - stored appState keys: ${Object.keys(storedAppState || {}).length}, shouldCenter: ${shouldCenter}`
        )

        if (shouldCenter) {
          const elements = excalidrawAPI.getSceneElements()
          if (elements.length > 0) {
            // Get viewport dimensions
            const currentAppState = excalidrawAPI.getAppState()
            const viewportWidth = currentAppState.width
            const viewportHeight = currentAppState.height

            // Calculate content bounds
            let minX = Number.POSITIVE_INFINITY
            let maxX = Number.NEGATIVE_INFINITY
            let minY = Number.POSITIVE_INFINITY
            let maxY = Number.NEGATIVE_INFINITY

            for (const el of elements) {
              minX = Math.min(minX, el.x)
              maxX = Math.max(maxX, el.x + el.width)
              minY = Math.min(minY, el.y)
              maxY = Math.max(maxY, el.y + el.height)
            }

            const contentWidth = maxX - minX

            // Calculate zoom to fit 70% of viewport width (accounting for sidebar)
            const SIDEBAR_WIDTH = 280
            const availableWidth = viewportWidth - SIDEBAR_WIDTH
            const targetWidth = availableWidth * 0.7
            const zoom = Math.min(targetWidth / contentWidth, 2) // Max zoom 2x

            // Calculate scroll positions
            // Horizontal: center the content in the available space (viewport - sidebar)
            const contentCenterX = minX + contentWidth / 2
            const availableCenterX = SIDEBAR_WIDTH + availableWidth / 2
            const scrollX = availableCenterX - contentCenterX * zoom

            // Vertical: 5% margin from top
            const scrollY = viewportHeight * 0.05 - minY * zoom

            // Apply centering
            console.log(`[Canvas] 🎯 Centering drawing ${activeDrawingId.slice(0, 8)}`)
            excalidrawAPI.updateScene({
              appState: {
                scrollX,
                scrollY,
                // biome-ignore lint/suspicious/noExplicitAny: Excalidraw zoom type mismatch
                zoom: { value: zoom as any },
              },
            })
          }
        }
      } catch (error) {
        console.error("[Canvas] Failed to check scroll position:", error)
      }
    }

    // Execute immediately
    centerIfNeeded()
  }, [excalidrawAPI, activeDrawingId, repository])

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "s",
      meta: true,
      handler: () => forceSave(),
      description: "Save drawing",
    },
    {
      key: "l",
      meta: true,
      handler: () => {
        const selected = adapter.getSelectedElementIds()
        if (selected.length > 0 || hasSelection) {
          setIsLinkModalOpen(true)
        }
      },
      description: "Add link to selection",
    },
    {
      key: "k",
      meta: true,
      handler: () => {
        const selected = adapter.getSelectedElementIds()
        if (selected.length > 0 || hasSelection) {
          setIsLinkModalOpen(true)
        }
      },
      description: "Add link to selection",
    },
  ])

  const handleOpenLinkModal = useCallback(() => {
    if (hasSelection) setIsLinkModalOpen(true)
  }, [hasSelection])

  const handleLinkSelect = useCallback(
    (targetDrawingId: string, _targetTitle: string, targetElementId?: string) => {
      const link = targetElementId
        ? createElementLink(targetDrawingId, targetElementId)
        : createDrawingLink(targetDrawingId)

      for (const elementId of selectedElementIds) {
        adapter.setElementLink(elementId, link)
      }

      setIsLinkModalOpen(false)
      triggerSaveRef.current()
      console.log(`[Canvas] Linked ${selectedElementIds.length} element(s)`)
    },
    [selectedElementIds, adapter.setElementLink]
  )

  const handleUrlSelect = useCallback(
    (url: string) => {
      for (const elementId of selectedElementIds) {
        adapter.setElementLink(elementId, url)
      }

      setIsLinkModalOpen(false)
      triggerSaveRef.current()
      console.log(`[Canvas] Linked ${selectedElementIds.length} element(s) to URL`)
    },
    [selectedElementIds, adapter.setElementLink]
  )

  useEffect(() => {
    if (!excalidrawAPI) return

    console.log("[Canvas] Initializing Excalidraw adapter")
    adapter.setAPI(excalidrawAPI)

    let changeTimeout: number | null = null

    const handleChange = async () => {
      // Debounce onChange to avoid multiple rapid calls
      if (changeTimeout) clearTimeout(changeTimeout)

      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: onChange handler requires auto-create and save logic
      changeTimeout = setTimeout(async () => {
        console.log("[Canvas] Content changed")

        // Auto-crear dibujo si no hay uno activo y hay contenido
        if (!activeDrawingId) {
          const content = adapter.getContent()
          const hasContent = content.elements && content.elements.length > 0

          if (hasContent) {
            console.log("[Canvas] Auto-creating 'Untitled' drawing")
            try {
              const newId = await drawingService.createDrawing({
                title: "Untitled",
                parent_id: null,
                content,
              })
              setActiveDrawingId(newId)
              return // No trigger save, ya guardamos al crear
            } catch (error) {
              console.error("[Canvas] Failed to auto-create drawing:", error)
              setCanvasError("Failed to create drawing")
            }
          }
        }

        triggerSaveRef.current()
      }, 100) // 100ms debounce
    }

    const unsubscribe = adapter.onChange(handleChange)
    return () => {
      console.log("[Canvas] Cleaning up onChange subscription")
      if (changeTimeout) clearTimeout(changeTimeout)
      unsubscribe()
    }
  }, [
    excalidrawAPI,
    activeDrawingId,
    setActiveDrawingId,
    adapter.getContent,
    adapter.onChange,
    adapter.setAPI,
    drawingService.createDrawing,
  ])

  // Imperative theme sync to Excalidraw scene
  useEffect(() => {
    if (!excalidrawAPI) return
    excalidrawAPI.updateScene({
      appState: {
        theme,
      },
    })
  }, [theme, excalidrawAPI])

  // Recalculate dimensions on drawing navigation or canvas API init
  useEffect(() => {
    if (!excalidrawAPI || !activeDrawingId) return

    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"))
    }, 50)

    return () => clearTimeout(timer)
  }, [excalidrawAPI, activeDrawingId])

  // ── Drag & Drop handling via window capture-phase listeners ──
  // Using window capture phase guarantees we intercept dragover and drop BEFORE Excalidraw can cancel/stop them.
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  useEffect(() => {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Dragover bounds and mime-type check
    const handleGlobalDragOver = (e: DragEvent) => {
      const el = canvasRef.current
      if (!el) return

      const isOurDrag =
        e.dataTransfer?.types.includes("application/linkdraw-drawing-id") ||
        e.dataTransfer?.types.includes("text/plain")

      if (!isOurDrag) return

      const rect = el.getBoundingClientRect()
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      if (isInside) {
        e.preventDefault()
        if (e.dataTransfer) e.dataTransfer.dropEffect = "link"
        setIsDraggingOver(true)
      } else {
        setIsDraggingOver(false)
      }
    }

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Global drop handler with position calculation and element/link creation
    const handleGlobalDrop = async (e: DragEvent) => {
      const el = canvasRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      if (!isInside) {
        setIsDraggingOver(false)
        return
      }

      const globalDragged = window.__linkdraw_dragged_drawing ?? null
      const rawData = e.dataTransfer?.getData("text/plain")?.trim() ?? ""
      const customId = e.dataTransfer?.getData("application/linkdraw-drawing-id")?.trim() ?? ""
      const customTitle =
        e.dataTransfer?.getData("application/linkdraw-drawing-title")?.trim() ?? ""

      let drawingId = globalDragged?.id || customId
      if (!drawingId && rawData.startsWith("drawing://")) {
        drawingId = rawData.slice("drawing://".length)
      }

      if (!drawingId) {
        setIsDraggingOver(false)
        return
      }

      e.preventDefault()
      e.stopPropagation()
      setIsDraggingOver(false)

      let drawingTitle = globalDragged?.title || customTitle
      if (!drawingTitle && drawingId) {
        try {
          const loaded = await repository.loadDrawing(drawingId)
          if (loaded?.title) drawingTitle = loaded.title
        } catch (err) {
          console.error("Failed to load title for dropped drawing:", err)
        }
      }
      if (!drawingTitle) drawingTitle = "Linked Drawing"

      window.__linkdraw_dragged_drawing = null

      const api = excalidrawAPIRef.current
      if (!api) return

      console.log(`[Canvas] Drop detected: ${drawingTitle} (${drawingId})`)

      const link = createDrawingLink(drawingId)
      const selectedIds = adapter.getSelectedElementIds()

      if (selectedIds.length > 0) {
        for (const id of selectedIds) {
          adapter.setElementLink(id, link)
        }
        triggerSaveRef.current()
        console.log(`[Canvas] Linked ${selectedIds.length} element(s) via Drag & Drop`)
      } else {
        const { x: dropX, y: dropY } = viewportCoordsToSceneCoords(
          { clientX: e.clientX, clientY: e.clientY },
          api.getAppState()
        )

        const labelText = `📄 ${drawingTitle}`
        adapter.addElements([
          {
            type: "text",
            x: dropX,
            y: dropY,
            text: labelText,
            fontSize: 18,
            fontFamily: 1,
            link,
            width: Math.max(160, labelText.length * 12),
            height: 36,
          },
        ])
        triggerSaveRef.current()
        console.log(`[Canvas] Created linked element for '${drawingTitle}' at (${dropX}, ${dropY})`)
      }
    }

    const handleGlobalDragEnd = () => {
      window.__linkdraw_dragged_drawing = null
      setIsDraggingOver(false)
    }

    window.addEventListener("dragover", handleGlobalDragOver, true)
    window.addEventListener("drop", handleGlobalDrop, true)
    window.addEventListener("dragend", handleGlobalDragEnd, true)

    return () => {
      window.removeEventListener("dragover", handleGlobalDragOver, true)
      window.removeEventListener("drop", handleGlobalDrop, true)
      window.removeEventListener("dragend", handleGlobalDragEnd, true)
    }
  }, [adapter.getSelectedElementIds, adapter.setElementLink, adapter.addElements, repository])

  // ── Wiki [[ selection handler ──
  // When user picks a drawing from the [[ autocomplete:
  //   1. Replace [[query in the WYSIWYG textarea with the drawing title
  //   2. Exit text editing (blur)
  //   3. Apply the drawing:// link to the element
  const handleWikiSelect = useCallback(
    (id: string, title: string) => {
      const link = createDrawingLink(id)
      const api = excalidrawAPIRef.current

      // Get the editing element ID before we exit edit mode
      let editingElementId: string | null = null
      if (api) {
        // biome-ignore lint/suspicious/noExplicitAny: editingTextElement exists on Excalidraw appState but not in our partial type
        const appState = api.getAppState() as any
        editingElementId = appState.editingTextElement?.id ?? null
      }

      // Replace [[query in the textarea with the drawing title
      const textarea = document.querySelector<HTMLTextAreaElement>(".excalidraw-wysiwyg")
      if (textarea) {
        const text = textarea.value
        const idx = text.lastIndexOf("[[")
        if (idx !== -1) {
          const newText = text.substring(0, idx) + title
          const nativeSet = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            "value"
          )?.set
          if (nativeSet) nativeSet.call(textarea, newText)
          else textarea.value = newText
          textarea.dispatchEvent(new Event("input", { bubbles: true }))
        }
        // Exit text editing
        textarea.blur()
      }

      // Apply link after text editing commits (small delay to let Excalidraw process the blur)
      setTimeout(() => {
        if (editingElementId) {
          // Also update the element text directly (in case blur didn't commit textarea value)
          if (api) {
            const elements = api.getSceneElements()
            const updatedElements = elements.map((el) => {
              if (el.id === editingElementId) {
                // biome-ignore lint/suspicious/noExplicitAny: Excalidraw text element has .text property
                const currentText = (el as any).text || ""
                const idx = currentText.lastIndexOf("[[")
                const cleanText = idx !== -1 ? currentText.substring(0, idx) + title : currentText
                return {
                  ...el,
                  text: cleanText,
                  originalText: cleanText,
                  link,
                }
              }
              return el
            })
            api.updateScene({ elements: updatedElements })
          } else {
            adapter.setElementLink(editingElementId, link)
          }
          triggerSaveRef.current()
        } else {
          // Fallback: if elements are selected, link them
          const selectedIds = adapter.getSelectedElementIds()
          if (selectedIds.length > 0) {
            for (const elId of selectedIds) {
              adapter.setElementLink(elId, link)
            }
            triggerSaveRef.current()
          }
        }
      }, 150)
    },
    [adapter.setElementLink, adapter.getSelectedElementIds]
  )

  const isMobile = useIsMobile()

  return (
    <div ref={canvasRef} className="w-full h-full relative overflow-hidden flex-1 min-h-0">
      {isDraggingOver && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none transition-colors transition-opacity m-3 rounded-2xl"
          style={{
            backgroundColor:
              theme === "dark" ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.12)",
            border: `2px dashed ${colors.accent}`,
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            className="px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold"
            style={{
              backgroundColor: colors.background,
              color: colors.accent,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Icon name="link" size={20} color={colors.accent} />
            <span>Drop drawing here to link element or create card</span>
          </div>
        </div>
      )}
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center h-full"
            style={{
              backgroundColor: "var(--color-surface-primary, #ffffff)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "3px solid rgba(0, 0, 0, 0.1)",
                  borderTopColor: "rgba(0, 0, 0, 0.6)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <div style={{ fontSize: "14px", color: "rgba(0, 0, 0, 0.6)" }}>Loading canvas...</div>
            </div>
          </div>
        }
      >
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={{
            appState: {
              ...(isMobile && { viewModeEnabled: false }),
            },
          }}
          theme={theme}
          onChange={() => adapter.notifyChange()}
          onLinkOpen={handleLinkOpen}
          UIOptions={{
            canvasActions: {
              toggleTheme: false,
            },
          }}
          renderTopRightUI={
            isMobile
              ? undefined
              : () => <LinkButton onClick={handleOpenLinkModal} disabled={!hasSelection} />
          }
        />
      </Suspense>

      <DrawingPickerModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSelect={handleLinkSelect}
        onSelectUrl={handleUrlSelect}
        currentDrawingId={activeDrawingId}
      />

      <GlobalWikiModal
        isOpen={isWikiModalOpen}
        onClose={() => setIsWikiModalOpen(false)}
        onSelectDrawing={handleWikiSelect}
        currentDrawingId={activeDrawingId}
        filterText={wikiFilterText}
      />

      {errorMessage && <Toast message={errorMessage} type="error" onClose={clearError} />}
      {canvasError && (
        <Toast message={canvasError} type="error" onClose={() => setCanvasError(null)} />
      )}
      {demo && (
        <>
          {demo.stage === "linking" && (
            <DemoWikiSuggestion
              title="Welcome to Link Draw"
              selectedIndex={demo.suggestionIndex ?? 0}
              accent={colors.accent}
              background={colors.background}
              border={colors.border}
              text={colors.text}
              textSecondary={colors.textSecondary}
            />
          )}
          {demo.cursor && (
            <DemoNavigationCursor
              key={demo.cursor.mode}
              cursor={demo.cursor}
              accent={colors.accent}
              background={colors.background}
            />
          )}
          <LinkDemoGuide
            demo={demo}
            accent={colors.accent}
            background={colors.background}
            border={colors.border}
            text={colors.text}
            textSecondary={colors.textSecondary}
          />
        </>
      )}

      <DrawingLinkPreviewPopover
        targetDrawingId={previewTarget?.drawingId ?? null}
        position={previewTarget?.position ?? null}
        onClose={() => setPreviewTarget(null)}
        onNavigate={(id) => setActiveDrawingId(id)}
      />
    </div>
  )
}
