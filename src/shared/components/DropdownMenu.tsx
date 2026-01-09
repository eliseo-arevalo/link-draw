import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"

interface DropdownMenuProps {
  isOpen: boolean
  children: ReactNode
  onClose?: () => void
  anchorRef?: React.RefObject<HTMLElement | null>
}

interface DropdownMenuItemProps {
  icon?: ReactNode
  label: string
  onClick: () => void
  variant?: "default" | "danger"
}

export function DropdownMenu({ isOpen, children, anchorRef }: DropdownMenuProps) {
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)

  if (!isOpen) return null

  // Si hay anchorRef, calcular posición absoluta
  let style: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "0.25rem",
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: "4px",
    boxShadow: colors.shadowIsland,
    minWidth: "180px",
    maxWidth: "220px",
    zIndex: 99999,
    padding: "0.25rem",
    pointerEvents: "auto",
  }

  if (anchorRef?.current) {
    const rect = anchorRef.current.getBoundingClientRect()
    const menuWidth = 200

    // Calcular left para que no se salga de la pantalla
    let left = rect.right - menuWidth
    if (left < 8) left = 8 // Margen mínimo de 8px
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8
    }

    style = {
      ...style,
      position: "fixed",
      top: `${rect.bottom + 4}px`,
      left: `${left}px`,
      width: `${menuWidth}px`,
    }
  }

  const menu = (
    <div
      data-dropdown-menu="true"
      style={style}
      onClick={(e) => {
        // Solo detener propagación si el click es directamente en el contenedor
        // No en los botones hijos
        if (e.target === e.currentTarget) {
          e.stopPropagation()
        }
      }}
    >
      {children}
    </div>
  )

  // Si hay anchorRef, usar portal para renderizar fuera del DOM tree
  const result = anchorRef ? createPortal(menu, document.body) : menu
  return result
}

export function DropdownMenuItem({
  icon,
  label,
  onClick,
  variant = "default",
}: DropdownMenuItemProps) {
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)

  const isDanger = variant === "danger"

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={() => {}}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "0.5rem 0.75rem",
        fontSize: "0.875rem",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: isDanger ? "#ef4444" : colors.text,
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        borderRadius: "2px",
        pointerEvents: "auto",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isDanger
          ? "rgba(239, 68, 68, 0.1)"
          : colors.backgroundSecondary
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent"
      }}
    >
      {icon}
      {label}
    </button>
  )
}

export function DropdownMenuSeparator() {
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)

  return (
    <div
      style={{
        height: "1px",
        backgroundColor: colors.border,
        margin: "0.25rem 0",
      }}
    />
  )
}
