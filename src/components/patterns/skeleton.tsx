import { cn } from '@/lib/utils'

/**
 * A loading placeholder that is the SHAPE of the content it replaces.
 *
 * Skeletons, not spinners (interaction-spec.md, "Loading"): a spinner in a
 * blank area means the layout jumps when content lands, which reads as
 * unpolished and has a measurable performance cost. A skeleton holds the
 * space, so nothing moves.
 *
 * This is one block. Components compose blocks into their own shape — see
 * ExperienceCardSkeleton — rather than reaching for a generic grey rectangle.
 *
 * `aria-hidden`: a skeleton is decoration. The loading state itself is
 * announced by whichever container owns it (`aria-busy` on the section).
 * Announcing every grey block would be noise.
 *
 * `motion-safe:animate-pulse` — the shimmer runs only when the user has not
 * asked for reduced motion. Under reduced motion it is a still block, which
 * still communicates "something is coming", so this respects the rule that
 * reduced motion is never nothing at all.
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn('rounded-md bg-muted motion-safe:animate-pulse', className)}
      {...props}
    />
  )
}
