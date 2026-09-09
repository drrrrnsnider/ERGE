import { useId } from 'react'
import {
  Browse,
  FavoriteFilled,
  LocationOn,
  Menu,
  PersonOutlined,
  ConciergeStar,
  Search,
  Star,
  ShoppingCart,
} from '@/components/icons'
import { NavLink, Outlet } from 'react-router'
import { ButtonIcon } from '@/components/patterns/button'
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
 * Menu and wordmark. Profile used to sit on the right and is now a tab only,
 * so there is one entry point rather than two.
 *
 * A three-column grid rather than `justify-between`, because with the right
 * button gone the wordmark would drift off centre — the grid reserves the
 * space the button occupied and keeps it optically centred whatever ends up
 * on either side.
 */
function TopBar() {
  return (
    <header className="grid grid-cols-[3rem_1fr_3rem] items-center px-4 pt-[env(safe-area-inset-top)] pb-4">
      <ButtonIcon label="Menu" icon={Menu} to="/menu" />
      <p className="text-center text-[23px] font-semibold tracking-[23px] text-foreground">
        {/* The tracking adds a trailing gap after the last letter, which
          * pushes the wordmark off-centre. The negative margin takes it back. */}
        <span className="-mr-[23px]">ERGE</span>
      </p>
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
        {/* `Input Field Special` in the keyframe: a FULL Border/Default ring
          * rather than Input's top-only hairline, and it turns Border/Focus
          * while the field is focused — which is the whole time you are
          * typing. It carries data-slot="input-field" so the one focus-ring
          * rule in theme.css covers it too; this input suppresses its own
          * outline exactly like Input's does, and without that it had no
          * focus indicator at all. */}
        <div
          data-slot="input-field"
          className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card pr-3.5 pl-2 focus-within:border-ring"
        >
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
 * a top-right icon button. The doc says Profile was promoted to a tab, and
 * the doc wins: it is a tab here and the top-bar button is gone, so there is
 * exactly one way to reach it.
 *
 * Only Explore is wired. The rest render as plain items — visible, correctly
 * placed, not links. Deliberately NOT `disabled` buttons: a disabled control
 * promises interaction and then refuses it, which is worse for a screen
 * reader than an item that is simply not interactive.
 */
const TABS: ReadonlyArray<{
  label: string
  icon: IconComponent
  /**
   * The icon for the selected tab, where the design draws a different one.
   * Concierge is the case that has it: the keyframe shows the four-pointed
   * star as a stroke, and it fills in when you are on it. Purely visual —
   * NavLink's `aria-current` is what says "selected" to a screen reader, so
   * nothing here rests on the fill alone (SC 1.4.1).
   */
  activeIcon?: IconComponent
  to?: string
}> = [
  { label: 'Explore', icon: Browse, to: '/' },
  { label: 'Concierge', icon: Star, activeIcon: ConciergeStar },
  { label: 'Cart', icon: ShoppingCart },
  { label: 'Library', icon: FavoriteFilled },
  { label: 'Profile', icon: PersonOutlined },
]

function TabBar() {
  return (
    <nav aria-label="Primary" className="border-t border-card bg-background">
      <ul className="flex items-stretch justify-around">
        {TABS.map(({ label, icon: Icon, activeIcon: ActiveIcon, to }) => (
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
                {/* Children as a function, so the icon can react to selection
                  * the same way the colour does. A tab with no activeIcon
                  * keeps its one drawing and just changes colour. */}
                {({ isActive }) => {
                  const Glyph = isActive && ActiveIcon ? ActiveIcon : Icon
                  return (
                    <>
                      <Glyph className="size-6" aria-hidden="true" />
                      {label}
                    </>
                  )
                }}
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
