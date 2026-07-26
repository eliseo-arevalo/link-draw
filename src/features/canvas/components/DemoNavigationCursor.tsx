import type { CSSProperties } from "react"
import type {
  LinkDemoCursor as LinkDemoCursorState,
  LinkDemoCursorMode,
} from "../hooks/useFirstLaunchLinkDemo"

interface DemoNavigationCursorProps {
  cursor: LinkDemoCursorState
  accent: string
  background: string
}

interface CursorStyle extends CSSProperties {
  "--demo-cursor-start-x": string
  "--demo-cursor-start-y": string
}

function getStartOffset(mode: LinkDemoCursorMode, cursor: LinkDemoCursorState) {
  if (mode === "compose") {
    return {
      x: Math.max(80, cursor.viewportWidth - cursor.x - 52),
      y: Math.max(80, cursor.viewportHeight - cursor.y - 52),
    }
  }

  return { x: 84, y: 96 }
}

export function DemoNavigationCursor({
  cursor,
  accent,
  background,
}: DemoNavigationCursorProps) {
  const startOffset = getStartOffset(cursor.mode, cursor)
  const cursorStyle: CursorStyle = {
    left: cursor.x,
    top: cursor.y,
    "--demo-cursor-start-x": `${startOffset.x}px`,
    "--demo-cursor-start-y": `${startOffset.y}px`,
  }
  const isComposing = cursor.mode === "compose"

  return (
    <div
      aria-hidden="true"
      className="absolute z-50 pointer-events-none"
      style={cursorStyle}
    >
      <style>{`
        @keyframes demo-compose-cursor-move {
          0% {
            transform: translate(var(--demo-cursor-start-x), var(--demo-cursor-start-y));
            opacity: 0;
          }
          8% { opacity: 1; }
          55%, 100% { transform: translate(0, 0); opacity: 1; }
          64%, 84% { transform: translate(0, 0) scale(0.88); }
          73%, 93% { transform: translate(0, 0) scale(1); }
        }
        @keyframes demo-navigation-cursor-move {
          0% {
            transform: translate(var(--demo-cursor-start-x), var(--demo-cursor-start-y));
            opacity: 0;
          }
          10% { opacity: 1; }
          68%, 100% { transform: translate(0, 0); opacity: 1; }
          82% { transform: translate(0, 0) scale(0.88); }
          92% { transform: translate(0, 0) scale(1); }
        }
        @keyframes demo-compose-click-pulse {
          0%, 55%, 75%, 100% { transform: scale(0.2); opacity: 0; }
          63%, 83% { transform: scale(1); opacity: 0.65; }
          72%, 92% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes demo-navigation-click-pulse {
          0%, 70% { transform: scale(0.2); opacity: 0; }
          83% { transform: scale(1); opacity: 0.65; }
          100% { transform: scale(1.9); opacity: 0; }
        }
      `}</style>
      <span
        className="absolute -left-3 -top-3 h-7 w-7 rounded-full border-2"
        style={{
          borderColor: accent,
          animation: `${
            isComposing ? "demo-compose-click-pulse 1.05s" : "demo-navigation-click-pulse 1.5s"
          } ease-out forwards`,
        }}
      />
      <svg
        className="absolute left-0 top-0 drop-shadow-md"
        width="30"
        height="36"
        viewBox="0 0 30 36"
        fill="none"
        style={{
          animation: `${
            isComposing ? "demo-compose-cursor-move 1.05s" : "demo-navigation-cursor-move 1.5s"
          } cubic-bezier(0.22, 1, 0.36, 1) forwards`,
          transformOrigin: "3px 2px",
        }}
      >
        <title>
          {isComposing
            ? "Demo cursor double-clicking to write"
            : "Demo cursor clicking the navigation arrow"}
        </title>
        <path d="M3 2v25l7-7 6 13 5-2-6-13h12L3 2Z" fill={background} stroke={accent} strokeWidth="2" />
      </svg>
    </div>
  )
}
