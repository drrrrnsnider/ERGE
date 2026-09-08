import type { LucideIcon } from 'lucide-react'
import {
  Compass,
  Heart,
  ShoppingCart,
  Sparkles,
  User,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { cn } from '@/lib/utils'

/**
 * The outermost layout archetype: the frame every screen renders inside.
 *
 * `<Outlet />` is the hole the current route's screen drops into. Swapping
 * screens swaps only what's inside the outlet — the frame stays mounted.
 *
 * STRUCTURE
 * ---------
 * A full-height column: main region, then the tab bar. `main` is the scroll
 * container, NOT the page. That is what lets the tab bar sit below it as a
 * sibling rather than floating over it with `position: fixed`, and it settles
 * WCAG 2.4.11 Focus Not Obscured structurally — the bar can never cover a
 * focused element inside main, because the two never overlap.
 *
 * SAFE AREAS
 * ----------
 * `env(safe-area-inset-*)` from the start. On a phone with a home indicator
 * the bar pads itself above it; on a notched top the main region pads under
 * it. index.html carries `viewport-fit=cover`, which is what makes these
 * values non-zero. Retrofitting this later means touching every screen.
 */
export function RootLayout() {
  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {/* Lets keyboard and screen-reader users jump the chrome (WCAG 2.4.1). */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      {/* tabIndex={-1} makes this focusable programmatically but keeps it out
        * of the tab order. Without it the skip link does not actually skip:
        * the hash changes and the page scrolls, but focus stays on <body>, so
        * the next Tab starts from the top of the chrome again — measured as
        * failing in Chromium and WebKit alike before this was added. A
        * keyboard user would land back where they started. */}
      <main
        id="main"
        tabIndex={-1}
        className="min-h-0 flex-1 overflow-y-auto outline-none pt-[env(safe-area-inset-top)]"
      >
        <Outlet />
      </main>

      <TabBar />
    </div>
  )
}

/**
 * Five tabs (user-flows.md, "Navigation"). Only Explore is wired: the rest
 * render as plain items — visible, correctly placed, not links. Deliberately
 * NOT `disabled` buttons: a disabled control promises interaction and then
 * refuses it, which is worse for a screen reader than an item that is simply
 * not interactive. When a tab gets a screen, it becomes a NavLink here.
 */
const TABS: ReadonlyArray<{
  label: string
  icon: LucideIcon
  to?: string
}> = [
  { label: 'Explore', icon: Compass, to: '/' },
  { label: 'Concierge', icon: Sparkles },
  { label: 'Cart', icon: ShoppingCart },
  { label: 'Library', icon: Heart },
  { label: 'Profile', icon: User },
]

function TabBar() {
  return (
    <nav
      aria-label="Primary"
      className="border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map(({ label, icon: Icon, to }) => (
          <li key={label} className="flex-1">
            {to ? (
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-xs',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                <Icon className="size-6" aria-hidden="true" />
                {label}
              </NavLink>
            ) : (
              <span className="flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-xs text-muted-foreground">
                <Icon className="size-6" aria-hidden="true" />
                {label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
