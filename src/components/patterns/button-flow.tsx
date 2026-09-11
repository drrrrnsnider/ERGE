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
 * card, a flat champagne ring rather than the gradient the rest of the system
 * moved to, and a copper glow instead of a depth shadow. It is the one
 * control that stops you doing the work yourself and asks the concierge
 * instead, so it is meant to read as a different kind of offer. Do not
 * "correct" it into a Subtle Button.
 *
 * The glow is `--drop-shadow-flow`, the one shadow in the system cast in
 * copper rather than in the surface — see theme.css for why.
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
  className,
  ...props
}: React.ComponentProps<'button'> & {
  label?: string
  size?: 'SM' | 'Md'
}) {
  const md = size === 'Md'
  return (
    <button
      type="button"
      data-slot="button-flow"
      data-size={size}
      data-target="compact"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-emphasis bg-background text-body-md whitespace-nowrap text-foreground drop-shadow-flow',
        md ? 'h-12 gap-1.5 pr-4 pl-3 font-semibold' : 'h-8 gap-1 pr-3 pl-2',
        className,
      )}
      {...props}
    >
      <ConciergeStar2
        className={cn('shrink-0', md ? 'size-[22px]' : 'size-5')}
        aria-hidden="true"
      />
      {label}
    </button>
  )
}
