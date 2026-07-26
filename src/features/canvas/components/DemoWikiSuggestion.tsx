import { Icon } from "@/shared/components/Icon"

interface DemoWikiSuggestionProps {
  title: string
  selectedIndex: number
  accent: string
  background: string
  border: string
  text: string
  textSecondary: string
}

export function DemoWikiSuggestion({
  title,
  selectedIndex,
  accent,
  background,
  border,
  text,
  textSecondary,
}: DemoWikiSuggestionProps) {
  return (
    <div
      aria-live="polite"
      className="absolute z-50 w-64 overflow-hidden rounded-lg border shadow-xl pointer-events-none"
      style={{
        left: "50%",
        top: "50%",
        transform: "translate(-50%, 2.75rem)",
        backgroundColor: background,
        borderColor: border,
      }}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2 text-xs" style={{ borderColor: border }}>
        <span className="rounded px-1.5 py-0.5 font-mono font-semibold" style={{ backgroundColor: `${accent}1f`, color: accent }}>
          [[
        </span>
        <span style={{ color: textSecondary }}>Choose a drawing to link</span>
      </div>
      {["Welcome notes", title].map((suggestion, index) => {
        const selected = index === selectedIndex
        return (
          <div
            key={suggestion}
            className="flex items-center gap-2 px-3 py-2.5"
            style={{ backgroundColor: selected ? `${accent}12` : "transparent", color: text }}
          >
            <Icon name="file" size={14} color={selected ? accent : textSecondary} />
            <span className="flex-1 text-sm font-medium">{suggestion}</span>
            {selected && <span className="text-xs" style={{ color: accent }}>↵</span>}
          </div>
        )
      })}
    </div>
  )
}
