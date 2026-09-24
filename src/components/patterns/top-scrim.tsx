import { cn } from '@/lib/utils'

/**
 * The blur-and-tint behind a bar that floats over scrolling content.
 *
 * Two layers: the progressive blur first, the tint over it — the order the
 * design tool uses and the order the layer names in the frame imply
 * ("gradient + blur"). Both fade out downward so content dissolves under the
 * bar instead of meeting a hard edge.
 *
 * It was welded inside `TopBar`, next to the wordmark and the menu button.
 * Three screens want it now and only one of them wants a wordmark: Explore's
 * bar, the results summary bar over the map, and the detail screen's nav
 * bar. So the scrim is its own thing and the bar on top is the caller's.
 *
 * POSITIONED BY ITS PARENT. It fills whatever box it is dropped into and
 * sits behind that box's own children on `-z-10`, so the parent has to be
 * positioned. That keeps it from needing to know any bar's height — an
 * earlier version hardcoded 104px and had to be kept in step by hand.
 *
 * Inert on both counts: `pointer-events-none` because it covers scrollable
 * content that must stay tappable, and `aria-hidden` because it is a tint.
 */
export function TopScrim({ className }: { className?: string }) {
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 backdrop-blur-fade-b',
          className,
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 bg-fade-b',
          className,
        )}
      />
    </>
  )
}
