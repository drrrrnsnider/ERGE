import { useQuery } from '@tanstack/react-query'
import {
  CollectionCard,
  CollectionCardSkeleton,
} from '@/components/app/collection-card'
import { EmptyState } from '@/components/patterns/empty-state'
import { ErrorState } from '@/components/patterns/error-state'
import { listCollections } from '@/lib/api/collections'
import { toApiError } from '@/lib/api/schemas/error'

/**
 * Library — Wishlists (Figma 230:8951). Every wishlist, as a two-column
 * grid of `Card / List MD`, 16px apart both ways.
 *
 * Renders into `LibraryLayout`, which draws the title and the pills.
 *
 * NOTHING CREATES A WISHLIST HERE. They are made from the experience page —
 * "Add to → Wishlist → New" (Darrin, 2026-10-05) — which is not built yet.
 * So a first run, and every run until that exists, shows the empty state,
 * which is the honest state rather than a gap: there are no fixture
 * wishlists to hide it.
 *
 * A card opens the wishlist at /library/wishlists/:id. The detail screen is
 * next; until it lands the link reaches the not-built route, and the
 * Library tab stays lit because it owns /library.
 */

const queryKey = ['collections', 'wishlist'] as const

export function LibraryWishlistsRoute() {
  const query = useQuery({
    queryKey,
    queryFn: () => listCollections('wishlist'),
  })

  if (query.isPending) {
    return (
      <div aria-busy="true" className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <CollectionCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (query.isError) {
    return (
      <ErrorState
        error={toApiError(query.error)}
        onRetry={() => void query.refetch()}
      />
    )
  }

  if (query.data.items.length === 0) {
    /* No design for this yet — see docs/backlog.md. Says where wishlists
     * come from, since nothing on this screen makes one. */
    return (
      <EmptyState
        title="No wishlists yet"
        description="Start one from any experience with Add to, then Wishlist."
      />
    )
  }

  return (
    <ul aria-label="Wishlists" className="grid grid-cols-2 gap-4">
      {query.data.items.map((wishlist) => (
        <li key={wishlist.collectionId} className="min-w-0">
          <CollectionCard
            collection={wishlist}
            href={`/library/wishlists/${encodeURIComponent(wishlist.collectionId)}`}
          />
        </li>
      ))}
    </ul>
  )
}
