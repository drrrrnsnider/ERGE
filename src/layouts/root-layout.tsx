import { useId } from 'react'
import {
  Browse,
  FavoriteFilled,
  LocationOn,
  Menu,
  Person,
  Search,
  ShoppingCart,
  Star,
} from '@/components/icons'
import { Link, NavLink, Outlet } from 'react-router'
import { cn } from '@/lib/utils'

/** Every icon in src/components/icons has this shape. */
type IconComponent = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

/**
 * The outermost layout archetype: the frame every screen renders inside.
 *
 * STRUCTURE, per the Explore frame
 * --------------------------------
 * Three bands in a full-height column: a top bar, the scrolling main region,
 * and a bottom bar holding the search field and the tab bar together.
 *
 * `main` is the scroll container, NOT the page. That is what lets both bars
 * sit as siblings rather than floating over content with `position: fixed`,
 * and it settles WCAG 2.4.11 Focus Not Obscured structurally — a bar can
 * never cover a focused element inside main, because the two never overlap.
 * The design draws a gradient scrim behind the bottom bar, which only makes
 * sense over scrolling content; as siblings we do not need it, and dropping
 * it is what buys the guarantee.
 *
 * SAFE AREAS
 * ----------
 * `env(safe-area-inset-*)` from the start. index.html carries
 * `viewport-fit=cover`, which is what makes these values non-zero.
 * Retrofitting this later means touching every screen.
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

      <TopBar />

      {/* tabIndex={-1} makes this focusable programmatically but keeps it out
        * of the tab order. Without it the skip link does not actually skip:
        * the hash changes and the page scrolls, but focus stays on <body>, so
        * the next Tab starts from the top of the chrome again — measured as
        * failing in Chromium and WebKit alike before this was added. */}
      <main
        id="main"
        tabIndex={-1}
        className="min-h-0 flex-1 overflow-y-auto outline-none"
      >
        <Outlet />
      </main>

      <BottomBar />
    </div>
  )
}

/**
 * `Button Icon` — a 48px circle on the card surface. Used three times in the
 * frame: menu, profile, and the location button beside search.
 */
function ButtonIcon({
  label,
  icon: Icon,
  to,
}: {
  label: string
  icon: IconComponent
  to: string
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="grid size-12 shrink-0 place-items-center rounded-full border border-border bg-card"
    >
      <Icon className="size-[22px]" aria-hidden="true" />
    </Link>
  )
}

/** Menu, wordmark, profile. The wordmark's tracking is 23px in the design. */
function TopBar() {
  return (
    <header className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] pb-4">
      <ButtonIcon label="Menu" icon={Menu} to="/menu" />
      <p className="text-[23px] font-semibold tracking-[23px] text-foreground">
        {/* The tracking adds a trailing gap after the last letter, which
          * pushes the wordmark off-centre. The negative margin takes it back. */}
        <span className="-mr-[23px]">ERGE</span>
      </p>
      <ButtonIcon label="Profile" icon={Person} to="/profile" />
    </header>
  )
}

/**
 * Search and the tab bar, as one band — the design groups them.
 *
 * The search field is a real, typeable input with no submit: Search itself is
 * not built, and a field that silently swallows Enter is more honest than a
 * button that goes nowhere. It is a `<search>` landmark so it is reachable
 * directly.
 */
function BottomBar() {
  const searchId = useId()
  return (
    <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
      <search className="flex items-center gap-2 px-5 py-2">
        <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card pr-3.5 pl-2">
          <span className="grid size-[30px] shrink-0 place-items-center">
            <Search className="size-[22px] text-muted-foreground" aria-hidden="true" />
          </span>
          <label htmlFor={searchId} className="sr-only">
            Search experiences
          </label>
          <input
            id={searchId}
            type="search"
            placeholder="What's your ERGE?"
            className="h-full min-w-0 flex-1 bg-transparent text-body-md text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ButtonIcon label="Search near me" icon={LocationOn} to="/search?near=me" />
      </search>

      <TabBar />
    </div>
  )
}

/**
 * Five tabs (user-flows.md, "Navigation").
 *
 * The frame draws FOUR — Explore, Concierge, Cart, Library — with Profile as
 * the top-right icon button. The doc says Profile was promoted to a tab, and
 * the doc wins, so Profile is both: a tab here and the top-bar button, which
 * are two entry points to one screen. Worth collapsing to one once the design
 * and the doc agree.
 *
 * Only Explore is wired. The rest render as plain items — visible, correctly
 * placed, not links. Deliberately NOT `disabled` buttons: a disabled control
 * promises interaction and then refuses it, which is worse for a screen
 * reader than an item that is simply not interactive.
 */
const TABS: ReadonlyArray<{
  label: string
  icon: IconComponent
  to?: string
}> = [
  { label: 'Explore', icon: Browse, to: '/' },
  { label: 'Concierge', icon: Star },
  { label: 'Cart', icon: ShoppingCart },
  { label: 'Library', icon: FavoriteFilled },
  { label: 'Profile', icon: Person },
]

function TabBar() {
  return (
    <nav aria-label="Primary" className="border-t border-card bg-background">
      <ul className="flex items-stretch justify-around">
        {TABS.map(({ label, icon: Icon, to }) => (
          <li key={label} className="flex-1">
            {to ? (
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 p-2 text-[11px] font-medium',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                <Icon className="size-6" aria-hidden="true" />
                {label}
              </NavLink>
            ) : (
              <span className="flex min-h-14 flex-col items-center justify-center gap-0.5 p-2 text-[11px] font-medium text-muted-foreground">
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
