import { useId } from 'react'
import {
  LocationOn,
  Menu,
  Search,
  TabCart,
  TabCartFilled,
  TabConcierge,
  TabConciergeFilled,
  TabExplore,
  TabExploreFilled,
  TabLibrary,
  TabLibraryFilled,
  TabProfile,
  TabProfileFilled,
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
 * `main` is the scroll container, NOT the page. Both bars therefore sit in
 * normal flow rather than floating with `position: fixed`.
 *
 * THE SEARCH ROW IS THE ONE EXCEPTION, and it is a deliberate reversal. The
 * design draws `bottom-input-fade` (Figma 230:8114) — a 104px scrim of
 * Surface/Base fading up to nothing — with the search field and the location
 * button sitting in it, so content is meant to pass UNDER them and dissolve.
 * That cannot be expressed by a sibling with a solid background, so the row
 * overlays the scroll area.
 *
 * An earlier version of this comment claimed that keeping every bar a sibling
 * settled WCAG 2.4.11 Focus Not Obscured structurally. That was true and it
 * is no longer, so it is replaced rather than left to mislead. The overlay is
 * held to the same guarantee by other means:
 *
 *   - `scroll-pb-*` on the scroll container reserves the row's height, so
 *     when focus moves to something underneath it the browser scrolls that
 *     element clear rather than treating it as already visible.
 *   - `pb-*` gives the content itself the same room, so the last card in a
 *     screen can reach a position where nothing covers it.
 *   - a Playwright test focuses the last card on the page and asserts its
 *     rectangle does not intersect the row's. Structure was doing this job;
 *     now a test does.
 *
 * The TAB BAR is still a sibling and still solid, exactly as the design draws
 * it — the fade ends where the tab bar begins.
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

      {/* The positioning context for BOTH overlays. They anchor to the edges
        * of the SCROLL AREA, not the viewport, so the tab bar below stays
        * untouched and each fade ends exactly where its bar does.
        *
        * TopBar comes before main in the DOM on purpose. It is positioned, so
        * its place here does not affect where it is drawn — but it does set
        * the tab order, and the menu button has to come before the page
        * content, not after it. */}
      <div className="relative min-h-0 flex-1">
        <TopBar />

        {/* tabIndex={-1} makes this focusable programmatically but keeps it
          * out of the tab order. Without it the skip link does not actually
          * skip: the hash changes and the page scrolls, but focus stays on
          * <body>, so the next Tab starts from the top of the chrome again —
          * measured as failing in Chromium and WebKit alike before it. */}
        <main
          id="main"
          tabIndex={-1}
          /* h-full, not flex-1: this is now a positioned box's child rather
           * than a flex item. `pb` lets content scroll clear of the overlay
           * and `scroll-pb` makes the browser scroll focus clear of it — the
           * two halves of keeping 2.4.11 without a structural guarantee.
           *
           * `isolate` is what keeps the overlay on top, and it is the whole
           * fix rather than a tweak. Neither this element (static) nor the
           * wrapper (relative, z-index auto) was creating a stacking context,
           * so a z-10 inside a card — the Elite badge, the save buttons — was
           * competing directly with the overlay's z-auto in the ROOT stacking
           * context, and winning. `isolation: isolate` makes this a stacking
           * context of its own, so every z-index in the screen is scoped to
           * it and none can outrank a later sibling.
           *
           * Deliberately not "give the overlay z-20". That wins today and
           * loses to the first z-30 someone writes in a card; this cannot be
           * outbid, because there is no number to bid. */
          className="isolate h-full overflow-y-auto pt-[calc(4rem+env(safe-area-inset-top))] pb-16 outline-none scroll-pt-[calc(4rem+env(safe-area-inset-top))] scroll-pb-16"
        >
          <Outlet />
        </main>

        <SearchOverlay />
      </div>

      <TabBar />
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
    <header className="absolute inset-x-0 top-0 z-10 grid grid-cols-[3rem_1fr_3rem] items-center px-4 pt-[env(safe-area-inset-top)] pb-4">
      {/* Blur first, then tint over it — the order design tools use, and the
        * order the layer names in the frame imply ("gradient + blur").
        *
        * Both live INSIDE the header rather than beside it so the header
        * sizes them. They used to be a sibling with a hardcoded 104px, which
        * had to be kept in step with the bar's height by hand; `inset-0`
        * cannot drift. `-z-10` keeps them behind the wordmark and the menu
        * button while staying inside the header's stacking context, so they
        * ride its z-10 over the scroll area.
        *
        * `pointer-events-none` because they cover the bar's whole width and
        * are decoration; `aria-hidden` for the same reason. The tint is
        * `from-background/75` rather than an rgba literal so it still tracks
        * Surface/Base. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 backdrop-blur-fade-b"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-background/75 to-transparent"
      />
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
 * The search field and the location button, floating over the scroll area on
 * `bottom-input-fade` (Figma 230:8114).
 *
 * The fade is 104px of Surface/Base at 75% dissolving upward to nothing, and
 * it ends where the tab bar starts — so content passes under the row and
 * disappears rather than meeting a hard edge. The alpha is expressed as
 * `from-background/75` rather than an rgba literal, which keeps it pointing
 * at the token: restyling Surface/Base moves the fade with it.
 *
 * `pointer-events-none` on the scrim, because it covers 104px of scrollable
 * content and is decoration — without it, everything under it stops being
 * clickable. `aria-hidden` for the same reason.
 *
 * The search field is a real, typeable input with no submit: Search itself is
 * not built, and a field that silently swallows Enter is more honest than a
 * button that goes nowhere. It is a `<search>` landmark so it is reachable
 * directly.
 */
function SearchOverlay() {
  const searchId = useId()
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-26 bg-linear-to-t from-background/75 to-transparent"
      />
      <search className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-5 py-2">
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
    </>
  )
}

/**
 * Five tabs, from `Nav Tab Bar` (Figma 162:14602).
 *
 * EVERY tab has two drawings — an outline at rest, a filled one when it is
 * the tab you are on — so `activeIcon` is required rather than optional. An
 * earlier build treated that as a Concierge-only flourish and left the other
 * four with a single glyph, which also meant Explore was permanently showing
 * its FILLED icon and Library its outline one under the name FavoriteFilled.
 *
 * Profile is settled too: the component set has all five tabs including a
 * Profile variant, so the design and user-flows.md agree and the note about
 * the frame drawing only four is gone.
 *
 * The resting icon is Text/Disabled while its label is Text/Muted — dimmer
 * than the word beside it, which is what the file draws. That is legible
 * because the icon is decorative: it carries aria-hidden and the label is the
 * accessible name, so nothing is communicated by the icon's contrast alone.
 *
 * Only Explore is wired. The rest render as plain items — visible, correctly
 * placed, not links. Deliberately NOT `disabled` buttons: a disabled control
 * promises interaction and then refuses it, which is worse for a screen
 * reader than an item that is simply not interactive.
 */
const TABS: ReadonlyArray<{
  label: string
  /** At rest. */
  icon: IconComponent
  /** When this is the current tab. Required — every tab in the set has one. */
  activeIcon: IconComponent
  to?: string
}> = [
  { label: 'Explore', icon: TabExplore, activeIcon: TabExploreFilled, to: '/' },
  { label: 'Concierge', icon: TabConcierge, activeIcon: TabConciergeFilled },
  { label: 'Cart', icon: TabCart, activeIcon: TabCartFilled },
  { label: 'Library', icon: TabLibrary, activeIcon: TabLibraryFilled },
  { label: 'Profile', icon: TabProfile, activeIcon: TabProfileFilled },
]

function TabBar() {
  return (
    <nav
      aria-label="Primary"
      /* Solid and in normal flow, unlike the search row above it — the design
       * fades INTO this, not over it. The safe-area inset moved here with it. */
      className="shrink-0 border-t border-card bg-background pb-[env(safe-area-inset-bottom)]"
    >
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
                {/* Children as a function, so the glyph can swap on selection
                  * the same way the colour does. */}
                {({ isActive }) => {
                  const Glyph = isActive ? ActiveIcon : Icon
                  return (
                    <>
                      <Glyph
                        className={cn(
                          'size-6',
                          // The current tab's icon inherits Action/Primary
                          // from the link; a resting one is dimmer than its
                          // own label, which is what the design draws.
                          !isActive && 'text-disabled-foreground',
                        )}
                        aria-hidden="true"
                      />
                      {label}
                    </>
                  )
                }}
              </NavLink>
            ) : (
              <span className="flex min-h-14 flex-col items-center justify-center gap-0.5 p-2 text-[11px] font-medium text-muted-foreground">
                <Icon
                  className="size-6 text-disabled-foreground"
                  aria-hidden="true"
                />
                {label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
