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
