import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface ToastProps {
  message: string
  type?: "error" | "warning" | "info"
  duration?: number
  onClose: () => void
}

export function Toast({ message, type = "error", duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onCloseRef.current(), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const bgColor = type === "error" ? "#ef4444" : type === "warning" ? "#f59e0b" : "#3b82f6"

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 999999,
        backgroundColor: bgColor,
        color: "#ffffff",
        padding: "0.75rem 1rem",
        borderRadius: "0.5rem",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        fontSize: "14px",
        fontWeight: 500,
        maxWidth: "400px",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(-1rem)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      {message}
    </div>,
    document.body
  )
}
