export {}

declare global {
  interface Window {
    __linkdraw_dragged_drawing?: { id: string; title: string } | null
  }
}
