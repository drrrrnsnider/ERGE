import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  deleteCollectionItem,
  getActiveCollection,
  putCollectionItem,
} from '@/lib/api/collections'
import type { Collection, CollectionItem } from '@/lib/api/schemas/collection'

/**
 * What this user has saved, and the heart that changes it.
 *
 * ONE ANSWER FOR EVERY SCREEN. Explore, the results list, the detail screen
 * and Library each used to keep their own `saved` in component state, so a
 * heart lit on Explore was dark again on the detail screen and forgotten on
 * navigation. They now all read the same cached collection through this
 * hook, so a save anywhere shows everywhere.
 *
 * Shared, so it lives here rather than beside one screen — lib/api's README
 * puts hooks with their screens, and this one has four.
 *
 * THE HEART ANSWERS INSTANTLY. A save goes to the server and takes a moment
 * to come back; waiting for it would make the heart feel broken. So the
 * cached collection is changed first ("optimistic"), the request goes out,
 * and if it fails the cache is put back the way it was — the heart goes
 * dark again, which is the honest report that the save did not happen.
 */

export const savedQuery = queryOptions({
  queryKey: ['collection', 'saved'] as const,
  queryFn: () => getActiveCollection('saved'),
})

type Change =
  | { kind: 'save'; experienceId: string }
  | { kind: 'remove'; experienceId: string }
  /** Undo: put back the item exactly as it was, so it returns to its place. */
  | { kind: 'restore'; item: CollectionItem }

const idOf = (change: Change) =>
  change.kind === 'restore' ? change.item.experienceId : change.experienceId

/** The change applied to a local copy — what the screen shows while it is in flight. */
function apply(collection: Collection, change: Change): Collection {
  const id = idOf(change)
  const without = collection.items.filter((i) => i.experienceId !== id)
  if (change.kind === 'remove') return { ...collection, items: without }
  const item =
    change.kind === 'restore'
      ? change.item
      : { experienceId: id, addedAt: new Date().toISOString(), selected: false }
  return {
    ...collection,
    items: [...without, item].sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
  }
}

const mutationKey = ['collection', 'saved', 'change'] as const

export function useSaved() {
  const client = useQueryClient()
  const query = useQuery(savedQuery)

  const ids = useMemo(
    () => new Set(query.data?.items.map((i) => i.experienceId)),
    [query.data],
  )

  const mutation = useMutation({
    mutationKey,
    mutationFn: async (change: Change) => {
      /* The id comes from the collection itself, so a tap before it has
       * loaded waits for it rather than failing. */
      const { collectionId } = await client.ensureQueryData(savedQuery)
      if (change.kind === 'remove') {
        return deleteCollectionItem(collectionId, change.experienceId)
      }
      return putCollectionItem(
        collectionId,
        change.kind === 'restore'
          ? { experienceId: change.item.experienceId, addedAt: change.item.addedAt }
          : { experienceId: change.experienceId },
      )
    },
    onMutate: async (change) => {
      /* A fetch already on its way back would overwrite the optimistic copy
       * with an older answer. */
      await client.cancelQueries({ queryKey: savedQuery.queryKey })
      const before = client.getQueryData(savedQuery.queryKey)
      if (before) client.setQueryData(savedQuery.queryKey, apply(before, change))
      return { before }
    },
    onError: (_error, _change, context) => {
      if (context?.before) client.setQueryData(savedQuery.queryKey, context.before)
    },
    /* Refetch once the LAST change lands, not after each. Two quick taps are
     * two requests; replacing the cache with the first one's answer would
     * briefly undo the second tap on screen. */
    onSettled: () => {
      if (client.isMutating({ mutationKey }) === 1) {
        void client.invalidateQueries({ queryKey: savedQuery.queryKey })
      }
    },
  })

  return {
    /** The collection, newest first, once loaded. */
    collection: query.data,
    query,
    isSaved: (experienceId: string) => ids.has(experienceId),
    toggle: (experienceId: string) =>
      mutation.mutate({
        kind: ids.has(experienceId) ? 'remove' : 'save',
        experienceId,
      }),
    restore: (item: CollectionItem) => mutation.mutate({ kind: 'restore', item }),
  }
}
