import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  deleteCollectionItem,
  getCollection,
  putCollectionItem,
} from '@/lib/api/collections'
import type { Collection, CollectionItem } from '@/lib/api/schemas/collection'
import { toApiError } from '@/lib/api/schemas/error'

/**
 * One wishlist, and taking things out of it and putting them back.
 *
 * The same shape as `useSaved`, for the same reason: a change shows at once
 * ("optimistic") and is put back if the request fails. It is its own hook
 * rather than a generalised one because a wishlist has an id and Saved does
 * not, and the two invalidate different things; when a third collection
 * needs this, that is the moment to fold them together.
 *
 * Deleting from LIBRARY is not here — that is `useSaved`. It hides the
 * experience from this wishlist without touching the wishlist itself
 * (api-contract.md, `GET /collections/:id`), so the screen checks both.
 */

export const wishlistQuery = (collectionId: string) =>
  queryOptions({
    queryKey: ['collection', collectionId] as const,
    queryFn: () => getCollection(collectionId),
    /* A wishlist that does not exist is an answer, not a blip. */
    retry: (count, error) => toApiError(error).code !== 'not_found' && count < 2,
  })

type Change =
  | { kind: 'remove'; experienceId: string }
  | { kind: 'restore'; item: CollectionItem }

function apply(collection: Collection, change: Change): Collection {
  const id = change.kind === 'remove' ? change.experienceId : change.item.experienceId
  const without = collection.items.filter((i) => i.experienceId !== id)
  if (change.kind === 'remove') return { ...collection, items: without }
  return {
    ...collection,
    items: [...without, change.item].sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
  }
}

export function useWishlist(collectionId: string) {
  const client = useQueryClient()
  const query = useQuery(wishlistQuery(collectionId))
  const { queryKey } = wishlistQuery(collectionId)
  const mutationKey = ['collection', collectionId, 'change'] as const

  const mutation = useMutation({
    mutationKey,
    mutationFn: (change: Change) =>
      change.kind === 'remove'
        ? deleteCollectionItem(collectionId, change.experienceId)
        : putCollectionItem(collectionId, {
            experienceId: change.item.experienceId,
            addedAt: change.item.addedAt,
          }),
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey })
      const before = client.getQueryData(queryKey)
      if (before) client.setQueryData(queryKey, apply(before, change))
      return { before }
    },
    onError: (_error, _change, context) => {
      if (context?.before) client.setQueryData(queryKey, context.before)
    },
    onSettled: () => {
      if (client.isMutating({ mutationKey }) === 1) {
        void client.invalidateQueries({ queryKey })
        /* The Wishlists grid's count for this one has changed too. */
        void client.invalidateQueries({ queryKey: ['collections', 'wishlist'] })
      }
    },
  })

  const ids = new Set(query.data?.items.map((i) => i.experienceId))

  return {
    query,
    collection: query.data,
    has: (experienceId: string) => ids.has(experienceId),
    remove: (experienceId: string) => mutation.mutate({ kind: 'remove', experienceId }),
    restore: (item: CollectionItem) => mutation.mutate({ kind: 'restore', item }),
  }
}
