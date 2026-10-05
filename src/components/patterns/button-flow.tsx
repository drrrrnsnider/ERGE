import { Link } from 'react-router'
import { ConciergeStar2 } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * `Button Flow` — the pill that hands the task over to the concierge.
 *
 * Figma 177:7353. Two sizes:
 *
 *   SM  32px, 20px glyph, Body/Medium    inside the search takeover
 *   Md  48px, 22px glyph, Action/Medium  standalone
 *
 * The weight changes with the size, not just the scale — SM is Regular and Md
 * is SemiBold — which is easy to miss and is why it lives here rather than
 * being applied per call site.
 *
 * IT LOOKS UNLIKE EVERY OTHER BUTTON ON PURPOSE. Base surface rather than
 * card, a light that runs round its edge, and a copper glow instead of a
 * depth shadow. It is the one control that stops you doing the work
 * yourself and asks the concierge instead, so it is meant to read as a
 * different kind of offer. Do not "correct" it into a Subtle Button.
 *
 * TWO BOXES. The element itself is the RING — `flow-ring` in theme.css,
 * 1px of padding showing a Border/Subtle Focus edge with a sliver of
 * Action/Secondary light orbiting it, the copper glow, and the brighter
 * hover. The inner span is the solid face that holds the glyph and the
 * words, and is what turns that 1px into a border. Sizes are on the outer
 * box, so the button is exactly as tall as before; the padding is on the
 * inner one, and comes out the same because the 1px ring replaces what was
 * a 1px border.
 *
 * IT OPTS OUT OF THE 44px COARSE-POINTER FLOOR, so SM stays 32px on a phone
 * and matches the design. That needs justifying, because it navigates, and
 * CLAUDE.md reserves the opt-out for secondary controls and names navigation
 * as a case that must keep the full 44. The call is Darrin's and the reasoning
 * is that this is an inline promo rather than a way through the app: it is
 * offered beside the work you were already doing, nothing depends on finding
 * it, and every route it reaches is reachable from the tab bar. If it ever
 * becomes the main way into the concierge, take this attribute off.
 *
 * The attribute is unconditional rather than tied to `size`, deliberately —
 * CLAUDE.md's rule is that an opt-out is never inferred from a variant name.
 * It changes nothing at Md, which is 48px and already clears the floor.
 */
export function ButtonFlow({
  label = 'Try planning with concierge',
  size = 'SM',
  to,
  className,
  ...props
}: React.ComponentProps<'button'> & {
  label?: string
  size?: 'SM' | 'Md'
  /**
   * Navigates instead of acting — a link, not a button that calls
   * navigate(), so it can be opened in a new tab and announces as a link.
   * The same split ButtonIcon makes.
   */
  to?: string
}) {
  const md = size === 'Md'
  const shape = cn(
    'inline-flex shrink-0 flow-ring text-body-md whitespace-nowrap text-foreground',
    md ? 'h-12 font-semibold' : 'h-8',
    className,
  )
  const content = (
    <span
      className={cn(
        'flex h-full items-center justify-center rounded-full bg-background',
        md ? 'gap-1.5 pr-4 pl-3' : 'gap-1 pr-3 pl-2',
      )}
    >
      {/* Action/Secondary, as the design colours the glyph — the same
        * champagne as the light running round the edge. */}
      <ConciergeStar2
        className={cn('shrink-0 text-action-secondary', md ? 'size-[22px]' : 'size-5')}
        aria-hidden="true"
      />
      {label}
    </span>
  )

  if (to) {
    return (
      <Link
        to={to}
        data-slot="button-flow"
        data-size={size}
        data-target="compact"
        className={shape}
      >
        {content}
      </Link>
    )
  }
  return (
    <button
      type="button"
      data-slot="button-flow"
      data-size={size}
      data-target="compact"
      className={shape}
      {...props}
    >
      {content}
    </button>
  )
}
