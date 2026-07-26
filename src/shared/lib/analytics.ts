const ANALYTICS_SCRIPT_ID = "linkdraw-analytics"

export function initializeAnalytics(): void {
  const scriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL?.trim()
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID?.trim()

  if (!scriptUrl || !websiteId || document.getElementById(ANALYTICS_SCRIPT_ID)) return

  const script = document.createElement("script")
  script.id = ANALYTICS_SCRIPT_ID
  script.defer = true
  script.src = scriptUrl
  script.dataset.websiteId = websiteId
  script.onerror = () => console.warn("Analytics script could not be loaded")
  document.head.appendChild(script)
}
