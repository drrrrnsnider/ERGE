import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

/**
 * A horizontal rail — a titled section whose items scroll sideways.
 *
 * THE ACCESSIBILITY APPROACH: build as little as possible.
 *
 * Carousels fail in four ways: scrollable by mouse but not keyboard, the
 * focused card scrolled out of sight, arrow keys hijacked into a trap, and
 * off-screen cards focusable but invisible. Every one of those is caused by
 * JavaScript a carousel adds. So this adds none.
 *
 *   - The scroller is a native `overflow-x: auto` list with CSS scroll-snap.
 *     No key handlers, no preventDefault. Tab always leaves, because nothing
 *     intercepts it. A trap requires code this file does not contain.
 *   - It is a real `<ul>` of `<li>` inside a `<section>` named by its own
 *     heading, so a screen reader gets "list, 8 items" and heading
 *     navigation. No `role="region"` per rail: eight landmarks on one screen
 *     is worse than none.
 *   - Each card is a link, so each is a tab stop. Deliberately NOT roving
 *     tabindex: a rail is a list of links, not a composite widget, and
 *     imposing widget focus on it would defeat the browser's own
 *     scroll-focused-thing-into-view behaviour. Eight cards is eight stops —
 *     honest, and the heading structure is the way past it.
 *   - Focus scrolls into view natively. `scroll-snap-type: mandatory` has a
 *     history of fighting that, which is why the e2e suite asserts it rather
 *     than trusting it: Tab to an off-screen card, assert the scroller moved
 *     and the card's box is inside the scroller's box.
 *   - `scroll-padding-inline` keeps a snapped card off the hard edge and
 *     leaves the next card peeking in — the peek is what says "this scrolls".
 *   - `motion-safe:scroll-smooth`: under reduced motion the scroll is
 *     instant, never absent (interaction-spec.md, "Motion").
 *   - The scrollbar is thin, not hidden. Hidden scrollbars remove a
 *     discoverability cue for mouse users and gain nothing.
 *
 * The scroller is not itself focusable. axe's `scrollable-region-focusable`
 * fires only when a scroll region has no keyboard-reachable content; ours is
 * full of links. Making it focusable too would add a redundant tab stop per
 * rail. If a rail ever holds non-focusable content, give the scroller
 * `tabIndex={0}` and a label — and only then.
 */
export function Rail({
  id,
  title,
  href,
  children,
  className,
  ...props
}: React.ComponentProps<'section'> & {
  id: string
  title: string
  /** Where the heading links, if that destination exists yet. */
  href?: string
}) {
  const headingId = `${id}-heading`
  return (
    <section
      aria-labelledby={headingId}
      data-slot="rail"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    >
      {/* `Section` — Heading/H2 with a chevron when there is somewhere to go.
        * "Ideas for Your Trip" has no chevron in the design, and passing no
        * href is what expresses that. */}
      <h2 id={headingId} className="px-4 text-h2 font-semibold text-foreground">
        {href ? (
          <Link to={href} className="inline-flex items-center gap-1 rounded-md">
            {title}
            <ChevronRight className="size-[21px] text-primary" aria-hidden="true" />
          </Link>
        ) : (
          title
        )}
      </h2>
      {children}
    </section>
  )
}

/**
 * The scrolling list. Put RailItems inside; put states in Rail instead.
 *
 * No JavaScript, deliberately. An earlier version carried an `onFocus`
 * handler that called `scrollIntoView`, added because WebKit appeared not to
 * scroll a focused card into view on its own. That measurement was wrong —
 * the test harness was sampling `scrollLeft` before a smooth scroll had
 * visibly started, so a pending animation read as no animation. With the
 * measurement fixed, WebKit scrolls focused elements into view natively, the
 * same as Chromium, and the handler was doing nothing. It is gone.
 *
 * The e2e suite asserts the native behaviour in all three projects, so if an
 * engine ever stops doing this, the failure arrives as a test rather than as
 * a bug report about invisible focus.
 */
export function RailScroller({
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="rail-scroller"
      className={cn(
        'flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2',
        'scroll-px-4 motion-safe:scroll-smooth [scrollbar-width:thin]',
        className,
      )}
      {...props}
    />
  )
}

export function RailItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="rail-item"
      className={cn('shrink-0 snap-start', className)}
      {...props}
    />
  )
}

/**
 * The slot a rail's loading, error or empty state sits in — the same
 * horizontal padding as the scroller, so the block lines up with the cards
 * it stands in for.
 */
export function RailState({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div className={cn('px-4', className)} {...props} />
}
