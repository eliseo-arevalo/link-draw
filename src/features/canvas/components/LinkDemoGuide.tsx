import type { LinkDemoState } from "../hooks/useFirstLaunchLinkDemo"

interface LinkDemoGuideProps {
  demo: LinkDemoState
  accent: string
  background: string
  border: string
  text: string
  textSecondary: string
}

const stages = [
  { id: "preparing", label: "Place the cursor" },
  { id: "typing", label: "Write a note" },
  { id: "linking", label: "Link the pages" },
  { id: "navigating", label: "Follow the link" },
] as const

export function LinkDemoGuide({
  demo,
  accent,
  background,
  border,
  text,
  textSecondary,
}: LinkDemoGuideProps) {
  const activeStage =
    demo.stage === "complete" ? stages.length : stages.findIndex((s) => s.id === demo.stage)

  return (
    <aside
      aria-live="polite"
      className="absolute bottom-5 left-5 z-50 w-64 rounded-xl border p-4 shadow-xl pointer-events-none"
      style={{ backgroundColor: background, borderColor: border }}
    >
      <p className="text-sm font-semibold" style={{ color: text }}>
        See linking in action
      </p>
      <p className="mt-1 text-xs" style={{ color: textSecondary }}>
        {demo.message}
      </p>
      <ol className="mt-3 space-y-2">
        {stages.map((stage, index) => {
          const complete = index < activeStage
          const active = index === activeStage
          return (
            <li
              key={stage.id}
              className="flex items-center gap-2 text-xs"
              style={{ color: textSecondary }}
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: complete || active ? accent : "transparent",
                  border: `1px solid ${complete || active ? accent : border}`,
                  color: complete || active ? "#ffffff" : textSecondary,
                }}
              >
                {complete ? "✓" : index + 1}
              </span>
              <span style={{ color: complete || active ? text : textSecondary }}>
                {stage.label}
              </span>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
