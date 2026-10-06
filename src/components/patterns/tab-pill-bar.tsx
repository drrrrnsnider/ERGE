import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

/**
 * `Tab Pill Bar` — Library's Experiences / Wishlists / Trips (Figma
 * 172:6369, pills from `.Tab Pill` 172:6368 / 172:6391).
 *
 * A capsule of Surface/Card at 33% with 8px of padding, holding
 * equal-width 32px pills. The selected pill takes the `Radial + Card` fill,
 * reusing the active filter chip's `bg-radial-card`. Body/SM, medium,
 * throughout; only colour, fill and edge change.
 *
 * BOTH EDGES ARE GRADIENTS, not hairlines. The bar's stroke is `Border
 * Default 100 → 0` and the selected pill's is `Border Brighter → 0`: each
 * full strength along the top and gone by the bottom. Those are the
 * existing `stroke-gradient-card` and `stroke-gradient` overlays, so they
 * take no layout space and the pill keeps its exact 32px. A flat `border`
 * was the first build and read as a hard outline the frame does not have.
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
        'flex h-12 gap-2 rounded-full bg-card/33 px-2 stroke-gradient-card',
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
          <span className="flex h-8 w-full items-center justify-center rounded-full px-2.5 text-body-sm font-medium text-muted-foreground group-aria-[current=page]:bg-radial-card group-aria-[current=page]:stroke-gradient group-aria-[current=page]:text-foreground">
            {text}
          </span>
        </NavLink>
      ))}
    </nav>
  )
}
