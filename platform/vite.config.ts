/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/epso-ad429-26-prep/',
  plugins: [react(), tailwindcss()],
  build: {
    // Content is code-split per reasoning skill/field/EUFTE (see
    // src/data/contentLoader.ts) and loaded on demand, not at initial load —
    // the biggest of those chunks (verbal reasoning, ~200 questions) is
    // inherently over the default 500kB warning threshold on its own, so
    // raise it rather than chase a warning about a chunk that's already
    // deferred behind a dynamic import().
    chunkSizeWarningLimit: 1100,
  },
  test: {
    environment: 'jsdom',
  },
})
