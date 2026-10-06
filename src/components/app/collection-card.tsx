import { Link } from 'react-router'
import type { CollectionSummary } from '@/lib/api/schemas/collection'
import { cn } from '@/lib/utils'

/**
 * `Card / List MD` (Figma 180:7424) — one collection in a grid: a square
 * cover, its name, and how many experiences it holds.
 *
 * Named for collections rather than wishlists because that is what it
 * draws. Wishlists are the first grid of them; lists are the next, and the
 * brief's bet is that they are the same thing with different metadata.
 *
 * The whole card is one link, so the target is the full tile. The name is
 * the link's accessible name; the count follows it as a second line.
 *
 * One line each, cut with "…", like every experience card — a long name
 * wrapping would make one tile in the grid taller than its neighbours.
 */
export function CollectionCard({
  collection,
  href,
  className,
}: {
  collection: CollectionSummary
  href: string
  className?: string
}) {
  const { name, itemCount, cover } = collection
  return (
    <Link
      to={href}
      data-slot="collection-card"
      className={cn(
        /* `isolate` keeps the cover's stroke ordered against the card's,
         * the same reason as Card / Media SM. */
        'relative isolate flex flex-col overflow-hidden rounded-md bg-card stroke-gradient-card',
        className,
      )}
    >
      {/* The cover is decorative — the name says what this is — and has the
        * empty image surface behind it, so an empty wishlist still draws a
        * tile rather than a hole. */}
      <div className="relative z-1 aspect-square overflow-hidden rounded-md bg-muted stroke-gradient">
        {cover ? (
          <img src={cover.url} alt="" loading="lazy" className="size-full object-cover" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-[3px] p-3">
        <span className="truncate text-body-md text-foreground">{name}</span>
        <span className="truncate text-body-xs text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'Experience' : 'Experiences'}
        </span>
      </div>
    </Link>
  )
}

/** The same shape while loading, so nothing shifts when the grid arrives. */
export function CollectionCardSkeleton() {
  return (
    <div
      data-slot="collection-card-skeleton"
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-md bg-card stroke-gradient-card"
    >
      <div className="aspect-square rounded-md bg-muted motion-safe:animate-pulse" />
      <div className="flex flex-col gap-[3px] p-3">
        <div className="h-4 w-3/4 rounded-xs bg-muted motion-safe:animate-pulse" />
        <div className="h-3 w-1/2 rounded-xs bg-muted motion-safe:animate-pulse" />
      </div>
    </div>
  )
}
