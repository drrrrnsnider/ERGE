import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Outlet } from 'react-router'
import { CollectionRow, useCollectionList } from '@/components/app/collection-list'
import {
  ExperienceCard,
  ExperienceCardSkeleton,
} from '@/components/app/experience-card'
import { EmptyState } from '@/components/patterns/empty-state'
import { ErrorState } from '@/components/patterns/error-state'
import { TabPillBar } from '@/components/patterns/tab-pill-bar'
import { getExperiencesByIds } from '@/lib/api/experiences'
import type { CollectionItem } from '@/lib/api/schemas/collection'
import { toApiError } from '@/lib/api/schemas/error'
import type { Experience } from '@/lib/api/schemas/experience'
import { savedQuery, useSaved } from '@/lib/use-saved'

/**
 * Library — Saved experiences (Figma 230:9755). The first collection screen.
 *
 * ONE LIST ARCHETYPE, FIRST INSTANCE. Cart, Trip, Wishlist, List and Saved
 * are one shape (docs/design-brief.md), and Saved is the one with no
 * metadata and one action: unsave. When the next collection is built, the
 * list below is what it should grow from rather than be copied.
 *
 * WHAT IS ON SCREEN IS A SNAPSHOT, ON PURPOSE. The rows are the saved
 * collection as it was when you arrived. Unsaving does not take the row
 * away at once — it turns into "… was removed" with Undo, in the same
 * place, so nothing jumps under your thumb and a mis-tap is one tap to put
 * right (Darrin's call). Undo counts down over 6s and then the row folds
 * away; under reduced motion there is no countdown and it stays for the
 * visit. So the row list comes from its own query, read once per visit,
 * while whether each row is still saved comes live from `useSaved`.
 *
 * THE TITLE AND THE PILLS ARE THE LAYOUT'S, not this screen's. Every tab
 * shares them, so `LibraryLayout` draws them once and each tab renders into
 * its Outlet — Saved here, Wishlists in library-wishlists.tsx. Trips is not
 * built and falls through to the not-built route. The frame's `+` is
 * deliberately absent until it has something to make.
 */

const SECTIONS = [
  { label: 'Experiences', to: '/library' },
  { label: 'Wishlists', to: '/library/wishlists' },
  { label: 'Trips', to: '/library/trips' },
] as const

type Row = { item: CollectionItem; experience: Experience }

/**
 * The saved list, as of arriving.
 *
 * `gcTime: 0` throws the snapshot away the moment Library unmounts, so the
 * next visit always reads afresh — which is what makes a removed row
 * actually go. Nothing invalidates it while you are here, so unsaving and
 * Undo never re-shuffle it under you.
 */
function useSavedSnapshot() {
  const client = useQueryClient()
  return useQuery({
    queryKey: ['library', 'saved-snapshot'],
    queryFn: async (): Promise<Row[]> => {
      const collection = await client.fetchQuery(savedQuery)
      const { items } = await getExperiencesByIds(
        collection.items.map((i) => i.experienceId),
      )
      const byId = new Map(items.map((e) => [e.experienceId, e]))
      /* An id whose experience has been delisted drops out here rather than
       * drawing an empty row. It stays in the collection; there is no design
       * for "you saved something that is gone" yet. */
      return collection.items.flatMap((item) => {
        const experience = byId.get(item.experienceId)
        return experience ? [{ item, experience }] : []
      })
    },
    gcTime: 0,
    staleTime: 0,
  })
}

/**
 * Library's frame: the title and the section pills, around whichever tab
 * is open. A tab renders as a fragment into this column, so the 16px gap
 * between the pills and the tab's first element is this layout's.
 */
export function LibraryLayout() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <header className="flex h-12 items-center">
        <h1 className="font-serif text-display-md text-foreground">Library</h1>
      </header>

      <TabPillBar label="Library sections" items={SECTIONS} />

      <Outlet />
    </div>
  )
}

/** The Experiences tab: everything saved with a heart. */
export function LibrarySavedRoute() {
  const snapshot = useSavedSnapshot()
  const saved = useSaved()
  const list = useCollectionList({ watch: saved.collection })
  const { listRef, emptyLinkRef } = list

  const remove = (row: Row) => {
    saved.toggle(row.experience.experienceId)
    list.announce(`${row.experience.title} was removed`)
    list.focusUndo(row.experience.experienceId)
  }

  const undo = (row: Row) => {
    saved.restore(row.item)
    list.announce(`${row.experience.title} is back in your saved list`)
    list.focusHeart(row.experience.experienceId)
  }

  const rows = snapshot.data?.filter((row) => !list.dismissed.has(row.item.experienceId))

  /* Until the live collection is here, every row would read as unsaved and
   * flash as removed. The snapshot fetches it first, so this is a guard
   * rather than a state anyone sees. */
  const isRemoved = (id: string) =>
    saved.collection !== undefined && !saved.isSaved(id)

  return (
    <>
      {list.status}

      {snapshot.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <ExperienceCardSkeleton key={i} variant="media-sm" className="w-full" />
          ))}
        </div>
      ) : null}

      {snapshot.isError ? (
        <ErrorState
          error={toApiError(snapshot.error)}
          onRetry={() => void snapshot.refetch()}
        />
      ) : null}

      {rows?.length === 0 ? (
        /* No design for this yet — see docs/backlog.md. The generic pattern
         * with words that say what to do, not just that nothing is here. */
        <EmptyState
          title="Nothing saved yet"
          description="Tap the heart on anything you'd like to come back to."
          action={
            /* A link that is really a target, so it carries
             * data-slot="button" and gets the 44px floor on a phone. */
            <Link
              ref={emptyLinkRef}
              to="/"
              data-slot="button"
              className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-card px-4 text-body-md text-primary"
            >
              Explore experiences
            </Link>
          }
        />
      ) : null}

      {rows !== undefined && rows.length > 0 ? (
        <ul ref={listRef} aria-label="Saved experiences" className="flex flex-col gap-4">
          {rows.map((row) => (
            <CollectionRow
              key={row.item.experienceId}
              experience={row.experience}
              removed={isRemoved(row.item.experienceId)}
              onUndo={() => undo(row)}
              onGone={(item) => list.dismiss(row.item.experienceId, item)}
              card={
                <ExperienceCard
                  experience={row.experience}
                  variant="media-sm"
                  className="w-full"
                  saved
                  onToggleSave={() => remove(row)}
                />
              }
            />
          ))}
        </ul>
      ) : null}
    </>
  )
}
