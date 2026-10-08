import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // O Tailwind 4 entra como plugin do Vite, não mais via PostCSS: o tema
  // vive em `@theme` dentro de src/index.css, e não há tailwind.config.js.
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
