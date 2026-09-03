import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Lets us write `import { Button } from '@/components/ui/button'`
      // instead of '../../../components/ui/button'.
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // Unit tests only. Playwright owns anything in e2e/.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: true,
  },
})
