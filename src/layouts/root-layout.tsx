import { Outlet } from 'react-router'

/**
 * The outermost layout archetype: the frame every screen renders inside.
 *
 * `<Outlet />` is the hole the current route's screen drops into. Swapping
 * screens swaps only what's inside the outlet — the frame stays mounted.
 *
 * Mobile-first: the shell is a single column that fills the viewport height,
 * with the main region scrolling on its own so a future bottom tab bar can sit
 * fixed beneath it without fighting the page scroll.
 */
export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Lets keyboard and screen-reader users jump the chrome (WCAG 2.4.1). */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <main id="main" className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
