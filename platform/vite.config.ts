/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/epso-ad429-26-prep/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
  },
})
