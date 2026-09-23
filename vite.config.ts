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
  server: {
    /* Vite ignores PORT and always takes 5173, which collides when another
     * session already holds a dev server there. Reading it here lets the
     * harness assign a free port and have Vite actually use it.
     *
     * `strictPort` only when PORT is set: an assigned port that turns out to
     * be busy should fail loudly rather than drift to the next one, because
     * the preview pane is then pointed at nothing — which is exactly what
     * happened before this existed. With no PORT, Vite's own fallback is
     * left alone, since playwright.config.ts boots `npm run dev` and expects
     * http://localhost:5173.
     */
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    strictPort: Boolean(process.env.PORT),
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
