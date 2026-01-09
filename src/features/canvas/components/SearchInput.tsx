interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  backgroundColor: string
  borderColor: string
  textColor: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  backgroundColor,
  borderColor,
  textColor,
}: SearchInputProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 text-sm rounded-lg mb-4 outline-none transition-colors"
      style={{
        backgroundColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
      }}
    />
  )
}
