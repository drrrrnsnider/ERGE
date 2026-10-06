import { useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
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
 * ONE HIGHLIGHT, AND IT MOVES (Darrin, 2026-10-06). The selected fill is a
 * single element under the pills, not something each pill draws. So:
 *
 *   slide   when the selection changes it eases from the old pill to the
 *           new one — Motion/Duration/Moderate, Easing/Standard. Under
 *           reduced motion it is simply there.
 *   drag    press on the highlighted pill and drag it along the bar, like an
 *           iOS segmented control. It follows the pointer, stretched a
 *           little and its edge brightened — the honest web version of
 *           "liquid glass"; true refraction is not available to CSS. On
 *           release it settles on the nearest pill and opens that tab.
 *           Under 4px of travel it was a tap, and the link handles it.
 *
 * Dragging is a pointer nicety on top of links that already work. The
 * keyboard, a screen reader, and a plain tap all use the links as before,
 * and nothing about them depends on the highlight.
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

/** Travel, in px, before a press counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 4

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
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const barRef = useRef<HTMLElement>(null)
  const pillRefs = useRef<(HTMLSpanElement | null)[]>([])

  /* Which pill is current — NavLink's `end` rule, by hand, because the
   * highlight needs the index and not just a class. */
  const active = items.findIndex(
    ({ to }) => pathname === to || pathname === `${to}/`,
  )

  /* Where the highlight sits, in px from the bar's left edge. `animate` is
   * off for the first placement, so it does not fly in from the left on
   * arrival, and on during a drag's release. */
  const [place, setPlace] = useState<{ x: number; width: number } | null>(null)
  const [animate, setAnimate] = useState(false)
  const [dragging, setDragging] = useState(false)

  /** A pill's box, measured from the bar. */
  const box = (index: number) => {
    const pill = pillRefs.current[index]
    return pill ? { x: pill.offsetLeft, width: pill.offsetWidth } : null
  }

  /* Follow the selection, and the bar's own width — a pill's position
   * changes when the screen does. */
  useLayoutEffect(() => {
    const bar = barRef.current
    if (!bar || active < 0) return
    const measure = () => setPlace(box(active))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [active, items.length])

  /* Turn the ease on once the first placement has painted. */
  useLayoutEffect(() => {
    if (place && !animate) {
      const frame = requestAnimationFrame(() => setAnimate(true))
      return () => cancelAnimationFrame(frame)
    }
  }, [place, animate])

  /* ---------------------------------------------------------------- drag */

  const drag = useRef<{
    pointerId: number
    startX: number
    from: number
    moved: boolean
  } | null>(null)
  /* A drag ends with a click on whatever is under the pointer. Swallow it,
   * or releasing over a different pill would open that one twice over. */
  const suppressClick = useRef(false)

  const onPointerDown = (event: React.PointerEvent) => {
    if (active < 0 || place === null || event.button !== 0) return
    /* Only the highlighted pill can be picked up. */
    const pill = pillRefs.current[active]
    if (!pill?.contains(event.target as Node)) return
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      from: place.x,
      moved: false,
    }
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId || place === null) return
    const dx = event.clientX - current.startX
    if (!current.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return
      current.moved = true
      /* Captured only now, so a plain tap still reaches the link. */
      barRef.current?.setPointerCapture(event.pointerId)
      setDragging(true)
    }
    const first = box(0)
    const last = box(items.length - 1)
    if (!first || !last) return
    const x = Math.min(Math.max(current.from + dx, first.x), last.x)
    setPlace({ x, width: place.width })
  }

  const finish = (event: React.PointerEvent, cancelled: boolean) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    drag.current = null
    if (!current.moved) return
    setDragging(false)
    suppressClick.current = true

    /* The nearest pill to where it was let go. */
    const centre = (place?.x ?? 0) + (place?.width ?? 0) / 2
    let nearest = active
    let best = Infinity
    items.forEach((_, i) => {
      const b = box(i)
      if (!b) return
      const distance = Math.abs(b.x + b.width / 2 - centre)
      if (distance < best) {
        best = distance
        nearest = i
      }
    })

    if (cancelled || nearest === active) {
      setPlace(box(active))
      return
    }
    /* Settle on it now, so the ease runs from where the finger left it;
     * the route change then confirms the same place. */
    setPlace(box(nearest))
    void navigate(items[nearest]!.to)
  }

  return (
    <nav
      ref={barRef}
      aria-label={label}
      data-slot="tab-pill-bar"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => finish(event, false)}
      onPointerCancel={(event) => finish(event, true)}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          suppressClick.current = false
          event.preventDefault()
          event.stopPropagation()
        }
      }}
      className={cn(
        /* `relative` so the highlight is placed against the bar.
         * `touch-action: pan-y` hands sideways movement to the drag while
         * an up-or-down swipe still scrolls the page. */
        'relative flex h-12 touch-pan-y gap-2 rounded-full bg-card/33 px-2 stroke-gradient-card',
        className,
      )}
    >
      {place ? (
        <div
          aria-hidden="true"
          data-slot="tab-pill-highlight"
          data-dragging={dragging || undefined}
          className={cn(
            'pointer-events-none absolute top-2 left-0 h-8',
            animate && !dragging &&
              'transition-[transform,width] duration-moderate ease-standard motion-reduce:transition-none',
          )}
          style={{ width: place.width, transform: `translateX(${place.x}px)` }}
        >
          {/* The fill and edge live on an inner layer: `stroke-gradient` sets
            * its own `position`, which would fight the outer `absolute`, and
            * the stretch below is a transform that must not overwrite the
            * one doing the moving. */}
          <div
            className={cn(
              'size-full rounded-full bg-radial-card stroke-gradient',
              'transition-transform duration-fast ease-standard',
              dragging && 'motion-safe:scale-x-[1.06] motion-safe:scale-y-[0.92]',
            )}
          />
        </div>
      ) : null}

      {items.map(({ label: text, to }, index) => (
        <NavLink
          key={to}
          to={to}
          /* `end` so /library lights Experiences only on itself, not on
           * /library/wishlists beneath it. */
          end
          /* A link is natively draggable — its URL — and the browser's own
           * drag would cancel ours mid-gesture. */
          draggable={false}
          /* Not positioned: each pill is measured from the BAR (its
           * offsetParent), so the link around it must not be one. */
          className="group flex min-w-0 flex-1 items-center"
        >
          <span
            ref={(element) => {
              pillRefs.current[index] = element
            }}
            /* `relative` puts the label ABOVE the highlight. The highlight is
             * positioned, and a positioned box paints over plain ones, so a
             * plain label sat underneath it. Positioned too, and later in the
             * page, the label wins. It does not change what the label is
             * measured from: that is still the bar. */
            className="relative flex h-8 w-full items-center justify-center rounded-full px-2.5 text-body-sm font-medium text-muted-foreground select-none group-aria-[current=page]:text-foreground"
          >
            {text}
          </span>
        </NavLink>
      ))}
    </nav>
  )
}
