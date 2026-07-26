export const lightTheme = {
  background: "#ffffff",
  backgroundSecondary: "#f8fafc",
  backgroundTertiary: "#f1f5f9",
  text: "#1e293b",
  textSecondary: "#64748b",
  border: "rgba(0, 0, 0, 0.08)",
  shadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  shadowIsland: "0 4px 16px rgba(0, 0, 0, 0.1)",
  overlay: "rgba(15, 23, 42, 0.4)",
  accent: "#4f46e5",
  accentLight: "rgba(79, 70, 229, 0.08)",
  activeBackground: "rgba(0, 0, 0, 0.04)",
  hoverBackground: "rgba(0, 0, 0, 0.03)",
  iconColor: "#64748b",
  iconActive: "#4f46e5",
  badgeBg: "rgba(0, 0, 0, 0.05)",
  inputBg: "#f8fafc",
}

export const darkTheme = {
  background: "#18181b",
  backgroundSecondary: "#27272a",
  backgroundTertiary: "#3f3f46",
  text: "#f4f4f5",
  textSecondary: "#a1a1aa",
  border: "rgba(255, 255, 255, 0.08)",
  shadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
  shadowIsland: "0 4px 16px rgba(0, 0, 0, 0.4)",
  overlay: "rgba(0, 0, 0, 0.75)",
  accent: "#818cf8",
  accentLight: "rgba(129, 140, 248, 0.12)",
  activeBackground: "rgba(255, 255, 255, 0.06)",
  hoverBackground: "rgba(255, 255, 255, 0.04)",
  iconColor: "#a1a1aa",
  iconActive: "#818cf8",
  badgeBg: "rgba(255, 255, 255, 0.08)",
  inputBg: "#27272a",
}

export type ThemeColors = typeof lightTheme

export function getThemeColors(theme: "light" | "dark"): ThemeColors {
  return theme === "dark" ? darkTheme : lightTheme
}
