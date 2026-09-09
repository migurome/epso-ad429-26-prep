/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

// La versión sale de package.json y de ningún otro sitio: dos números que
// haya que subir a mano se desincronizan a la primera. `define` la sustituye
// en el paquete, así que el package.json no llega al navegador.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  base: '/epso-ad429-26-prep/',
  define: { __APP_VERSION__: JSON.stringify(version) },
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // El contenido generado son cientos de miles de líneas de datos que
      // ninguna prueba «recorre»; incluirlo hundiría el porcentaje sin decir
      // nada sobre el código. Su corrección la vigila contentIntegrity.
      include: ['src/**'],
      exclude: ['src/data/*.generated.ts', 'src/**/*.test.*', 'src/main.tsx'],
    },
  },
})
