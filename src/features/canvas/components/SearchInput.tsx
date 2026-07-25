import type { RefObject } from "react"
import { Icon } from "@/shared/components/Icon"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  backgroundColor: string
  borderColor: string
  textColor: string
  inputRef?: RefObject<HTMLInputElement | null>
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search drawings or paste URL...",
  backgroundColor,
  borderColor,
  textColor,
  inputRef,
  onKeyDown,
}: SearchInputProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 transition-colors"
      style={{
        backgroundColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      <Icon name="search" size={16} color={textColor} />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full text-sm outline-none bg-transparent"
        style={{
          color: textColor,
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="p-0.5 rounded hover:opacity-80 transition-opacity"
          style={{ color: textColor, opacity: 0.6 }}
          title="Clear search"
        >
          <Icon name="x" size={14} color={textColor} />
        </button>
      )}
    </div>
  )
}
