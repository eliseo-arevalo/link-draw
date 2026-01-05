export const lightTheme = {
  background: "#ffffff",
  backgroundSecondary: "#f8fafc",
  text: "#1e293b",
  textSecondary: "#64748b",
  border: "rgba(0, 0, 0, 0.08)",
  shadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  shadowIsland: "0 4px 12px rgba(0, 0, 0, 0.15)",
  overlay: "rgba(0, 0, 0, 0.5)",
}

export const darkTheme = {
  background: "#1e1e1e",
  backgroundSecondary: "#121212",
  text: "#e5e7eb",
  textSecondary: "#9ca3af",
  border: "rgba(255, 255, 255, 0.1)",
  shadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  shadowIsland: "0 4px 12px rgba(0, 0, 0, 0.4)",
  overlay: "rgba(0, 0, 0, 0.7)",
}

export type ThemeColors = typeof lightTheme

export function getThemeColors(theme: "light" | "dark"): ThemeColors {
  return theme === "dark" ? darkTheme : lightTheme
}
