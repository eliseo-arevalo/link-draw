import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import { configDefaults } from "vitest/config"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          "react-vendor": ["react", "react-dom"],
          "excalidraw-vendor": ["@excalidraw/excalidraw"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    exclude: [
      // Exclude mermaid if not used
      "mermaid",
    ],
  },
  test: {
    environment: "happy-dom",
    exclude: [...configDefaults.exclude],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.d.ts",
        "src/main.tsx",
        "src/shared/types/**",
        "src/shared/interfaces/**",
        "**/*.config.ts",
        "**/node_modules/**",
        "**/dist/**",
      ],
      thresholds: {
        statements: 50,
        branches: 35,
        functions: 45,
        lines: 50,
      },
    },
  },
})
