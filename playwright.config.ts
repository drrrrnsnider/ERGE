import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright drives a real browser. It owns everything in e2e/; Vitest owns
 * the unit tests next to the source files. The two never overlap.
 *
 * `webServer` means you don't start the dev server yourself — Playwright boots
 * it, waits for it, runs the tests, and shuts it down.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  // Mobile-first, so a phone viewport is the primary target and desktop is
  // the secondary check — not the other way round.
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
  },
})
