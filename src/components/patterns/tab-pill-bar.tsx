import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

/**
 * `Tab Pill Bar` — Library's Experiences / Wishlists / Trips (Figma
 * 172:6369, pills from `.Tab Pill` 172:6368 / 172:6391).
 *
 * A capsule of Surface/Card at 33% with a Border/Default hairline and 8px of
 * padding, holding equal-width 32px pills. The selected pill takes `Radial +
 * Card` and the Border/Subtle Focus edge — the same treatment as the active
 * filter chip, so it reuses `bg-radial-card` rather than a second drawing of
 * it. Body/SM, medium, throughout; only colour and fill change.
 *
 * LINKS, NOT `role="tablist"`. Each pill is a different URL, so the browser
 * handles Back, a refresh keeps you on the same grouping, and a link to
 * Wishlists can be shared. ARIA tabs would promise panels switching in place
 * with arrow-key movement between them, which is not what happens. A
 * `<nav>` of links with `aria-current` says what is really there.
 *
 * FULL-SIZE TARGETS, ALWAYS. These are navigation, which CLAUDE.md never
 * lets opt down to compact — and the theme's 44px floor does not reach
 * links, so it would not catch them. Each link is the full 48px height of
 * the bar, reaching into its padding, with the 32px pill drawn inside it. The
 * bar looks exactly like the frame; the target is a thumb's worth.
 */
export type TabPillItem = { label: string; to: string }

export function TabPillBar({
  label,
  items,
  className,
}: {
  /** Names the nav landmark — "Library sections". */
  label: string
  items: readonly TabPillItem[]
  className?: string
}) {
  return (
    <nav
      aria-label={label}
      data-slot="tab-pill-bar"
      className={cn(
        'flex h-12 gap-2 rounded-full border border-border bg-card/33 px-2',
        className,
      )}
    >
      {items.map(({ label: text, to }) => (
        <NavLink
          key={to}
          to={to}
          /* `end` so /library lights Experiences only on itself, not on
           * /library/wishlists beneath it. */
          end
          className="group flex min-w-0 flex-1 items-center"
        >
          <span className="flex h-8 w-full items-center justify-center rounded-full border border-transparent px-2.5 text-body-sm font-medium text-muted-foreground group-aria-[current=page]:border-border-subtle-focus group-aria-[current=page]:bg-radial-card group-aria-[current=page]:text-foreground">
            {text}
          </span>
        </NavLink>
      ))}
    </nav>
  )
}
