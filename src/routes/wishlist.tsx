import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { CollectionRow, useCollectionList } from '@/components/app/collection-list'
import {
  ExperienceCard,
  ExperienceCardSkeleton,
} from '@/components/app/experience-card'
import {
  Add,
  ArrowBack,
  ConciergeStar2,
  Delete,
  DoNotDisturbOn,
  IosShare,
  MoreHoriz,
} from '@/components/icons'
import { ButtonIcon } from '@/components/patterns/button'
import { EmptyState } from '@/components/patterns/empty-state'
import { ErrorState } from '@/components/patterns/error-state'
import { Menu, MenuItem, MenuSeparator } from '@/components/patterns/menu'
import { TabPillBar } from '@/components/patterns/tab-pill-bar'
import { getExperiencesByIds } from '@/lib/api/experiences'
import type { CollectionItem } from '@/lib/api/schemas/collection'
import { toApiError } from '@/lib/api/schemas/error'
import type { Experience } from '@/lib/api/schemas/experience'
import { useSaved } from '@/lib/use-saved'
import { useWishlist, wishlistQuery } from '@/lib/use-wishlist'
import { NotBuiltRoute } from '@/routes/not-built'

/**
 * One wishlist (Figma 230:8629) — the list archetype's second instance,
 * after Library's Saved tab, and built from the same parts.
 *
 * A WISHLIST IS A WAY OF SORTING SAVED THINGS (Darrin, 2026-10-06), so every
 * heart here is filled, and there are two ways out:
 *
 *   Remove from Wishlist   out of this wishlist only; still saved
 *   Delete from Library    unsaved, and so out of every wishlist
 *
 * Tapping the heart asks which. The row's "•••" offers both too, beside the
 * actions the mockup draws (230:8707). Either leaves "… was removed" in
 * place with the same Undo countdown as the Saved tab, and Undo puts back
 * whichever one it was.
 *
 * TWO VIEWS, ONE SCREEN. `/library/wishlists/:id` is what is still wished
 * for and `…/purchased` what someone has bought — items with a `giftedBy`.
 * One route with an optional segment rather than two, so the screen stays
 * mounted when the pills change and the pill can slide between them.
 * Gifting is not built, so Purchased is always empty today.
 *
 * WHAT IS NOT BUILT, and where it goes meanwhile — the not-built route,
 * like every other link to a screen that does not exist yet:
 *   Share (title bar)       /library/wishlists/:id/share
 *   Rename (title •••)      /library/wishlists/:id/rename
 *   Add to Cart             /cart?add=:experienceId
 *   Share Experience        /experience/:id/share
 *   Add to…                 /experience/:id/add-to
 *   Build Trip              /library/trips/new?from=:experienceId
 * Suggested Additions, under the list, is the next piece of work.
 */

type Row = { item: CollectionItem; experience: Experience }

/** How a row left, so Undo knows what to put back. */
type Removal =
  | { from: 'wishlist'; item: CollectionItem }
  | { from: 'library'; item: CollectionItem }

export function WishlistRoute() {
  const { wishlistId = '', view } = useParams()

  /* `purchased` is the only second view. Anything else under a wishlist —
   * share, rename — is a screen that does not exist yet. */
  if (view !== undefined && view !== 'purchased') return <NotBuiltRoute />

  return <Wishlist wishlistId={wishlistId} purchased={view === 'purchased'} />
}

/**
 * The wishlist as it was when you arrived, read once per visit — the same
 * snapshot rule as the Saved tab, for the same reason: a removed row stays
 * where it was, as a message, rather than the list shuffling under you.
 */
function useWishlistSnapshot(wishlistId: string) {
  const client = useQueryClient()
  return useQuery({
    queryKey: ['wishlist-snapshot', wishlistId],
    queryFn: async (): Promise<{ name: string; rows: Row[] }> => {
      const collection = await client.fetchQuery(wishlistQuery(wishlistId))
      const { items } = await getExperiencesByIds(
        collection.items.map((i) => i.experienceId),
      )
      const byId = new Map(items.map((e) => [e.experienceId, e]))
      return {
        name: collection.name ?? 'Untitled',
        rows: collection.items.flatMap((item) => {
          const experience = byId.get(item.experienceId)
          return experience ? [{ item, experience }] : []
        }),
      }
    },
    gcTime: 0,
    staleTime: 0,
    retry: (count, error) => toApiError(error).code !== 'not_found' && count < 2,
  })
}

function Wishlist({ wishlistId, purchased }: { wishlistId: string; purchased: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const saved = useSaved()
  const wishlist = useWishlist(wishlistId)
  const snapshot = useWishlistSnapshot(wishlistId)
  const list = useCollectionList({ watch: [saved.collection, wishlist.collection] })
  const { listRef, emptyLinkRef } = list

  /* What each removed row was removed FROM, so its message can say so and
   * its Undo can put back the right thing. */
  const [removals, setRemovals] = useState<ReadonlyMap<string, Removal>>(new Map())
  const remember = (id: string, removal: Removal) =>
    setRemovals((current) => new Map(current).set(id, removal))

  const base = `/library/wishlists/${encodeURIComponent(wishlistId)}`

  /* Back to wherever you came from — or, opened cold from a shared link,
   * with nowhere in this app to go back to, the Wishlists grid. */
  const back = () =>
    location.key === 'default' ? void navigate('/library/wishlists') : void navigate(-1)

  const removeFromWishlist = (row: Row) => {
    const { experienceId, title } = row.experience
    remember(experienceId, { from: 'wishlist', item: row.item })
    wishlist.remove(experienceId)
    list.announce(`${title} was removed from this wishlist`)
    list.focusUndo(experienceId)
  }

  const deleteFromLibrary = (row: Row) => {
    const { experienceId, title } = row.experience
    /* The SAVED item, not the wishlist's — Undo restores the save with its
     * original date, and the wishlist membership comes back with it. */
    const item = saved.collection?.items.find((i) => i.experienceId === experienceId)
    if (item) remember(experienceId, { from: 'library', item })
    saved.toggle(experienceId)
    list.announce(`${title} was deleted from your Library`)
    list.focusUndo(experienceId)
  }

  const undo = (row: Row) => {
    const { experienceId, title } = row.experience
    const removal = removals.get(experienceId)
    if (removal?.from === 'library') saved.restore(removal.item)
    else wishlist.restore(row.item)
    list.announce(`${title} is back in this wishlist`)
    list.focusHeart(experienceId)
  }

  /* Both live answers must be in before a row can read as removed — until
   * then every row would flash as gone. */
  const ready = saved.collection !== undefined && wishlist.collection !== undefined
  const removedFrom = (id: string): Removal['from'] | null => {
    if (!ready) return null
    if (!saved.isSaved(id)) return 'library'
    if (!wishlist.has(id)) return 'wishlist'
    return null
  }

  const all = snapshot.data?.rows.filter((row) => !list.dismissed.has(row.item.experienceId))
  const wished = all?.filter((row) => row.item.giftedBy === undefined)
  const gifted = all?.filter((row) => row.item.giftedBy !== undefined)
  const rows = purchased ? gifted : wished

  /* Counts are what is IN the wishlist now, so they drop as you remove. */
  const live = (wishlist.collection?.items ?? []).filter((i) => saved.isSaved(i.experienceId))
  const wishedCount = live.filter((i) => i.giftedBy === undefined).length
  const giftedCount = live.length - wishedCount

  const error = snapshot.isError ? toApiError(snapshot.error) : null

  return (
    <div className="flex flex-col">
      {/* Nav bar: back, and the wishlist's own actions. */}
      <div className="flex h-12 items-center justify-between px-4">
        <ButtonIcon label="Back" icon={ArrowBack} onClick={back} />
        <div className="flex items-center gap-3">
          <ButtonIcon label="Share wishlist" icon={IosShare} to={`${base}/share`} />
          <Menu
            label="Wishlist options"
            trigger={<ButtonIcon label="Wishlist options" icon={MoreHoriz} />}
          >
            <MenuItem onClick={() => void navigate(`${base}/rename`)}>Rename</MenuItem>
          </Menu>
        </div>
      </div>

      {error?.code === 'not_found' ? (
        <div className="p-4">
          <EmptyState
            title="This wishlist is gone"
            description="It may have been deleted on another device."
            action={
              <Link
                to="/library/wishlists"
                data-slot="button"
                className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-card px-4 text-body-md text-primary"
              >
                Your wishlists
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <header className="flex flex-col gap-2 p-4">
            <p className="text-section-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Your Wishlist
            </p>
            {/* The name, once it is known. A pulse while it loads keeps the
              * page from jumping when it arrives. */}
            {snapshot.data ? (
              <h1 className="font-serif text-display-md text-foreground">{snapshot.data.name}</h1>
            ) : (
              <div aria-hidden="true" className="h-9 w-2/3 rounded-xs bg-muted motion-safe:animate-pulse" />
            )}
          </header>

          <div className="flex flex-col gap-4 px-4 py-2 pb-4">
            <TabPillBar
              label="Wishlist sections"
              items={[
                { label: `Wishlist (${wishedCount})`, to: base },
                { label: `Purchased (${giftedCount})`, to: `${base}/purchased` },
              ]}
            />

            {list.status}

            {snapshot.isPending ? (
              <div aria-busy="true" className="flex flex-col gap-4">
                {[0, 1, 2].map((i) => (
                  <ExperienceCardSkeleton key={i} variant="media-sm-full" />
                ))}
              </div>
            ) : null}

            {/* Any other failure: not_found is handled above, instead of
              * the whole page. */}
            {error ? (
              <ErrorState error={error} onRetry={() => void snapshot.refetch()} />
            ) : null}

            {rows?.length === 0 ? (
              /* Neither is designed yet — see docs/backlog.md. */
              purchased ? (
                <EmptyState
                  title="Nothing gifted yet"
                  description="When someone buys you something from this wishlist, it shows here."
                />
              ) : (
                <EmptyState
                  title="Nothing in this wishlist"
                  description="Add experiences to it from any experience's page."
                  action={
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
              )
            ) : null}

            {rows !== undefined && rows.length > 0 ? (
              <ul
                ref={listRef}
                aria-label={purchased ? 'Purchased' : 'Wishlist'}
                className="flex flex-col gap-4"
              >
                {rows.map((row) => {
                  const id = row.experience.experienceId
                  const from = removedFrom(id)
                  const removeItems = (
                    <>
                      <MenuItem icon={DoNotDisturbOn} onClick={() => removeFromWishlist(row)}>
                        Remove from Wishlist
                      </MenuItem>
                      <MenuItem
                        icon={Delete}
                        tone="destructive"
                        onClick={() => deleteFromLibrary(row)}
                      >
                        Delete from Library
                      </MenuItem>
                    </>
                  )
                  return (
                    <CollectionRow
                      key={id}
                      experience={row.experience}
                      removed={from !== null}
                      removedText={
                        from === 'library'
                          ? 'was deleted from your Library'
                          : 'was removed from this wishlist'
                      }
                      onUndo={() => undo(row)}
                      onGone={(item) => list.dismiss(id, item)}
                      card={
                        <ExperienceCard
                          experience={row.experience}
                          variant="media-sm-full"
                          saved
                          saveMenu={removeItems}
                          onAddToCart={() =>
                            void navigate(`/cart?add=${encodeURIComponent(id)}`)
                          }
                          moreMenu={
                            <>
                              <MenuItem
                                icon={IosShare}
                                onClick={() => void navigate(`/experience/${id}/share`)}
                              >
                                Share Experience
                              </MenuItem>
                              <MenuItem
                                icon={Add}
                                onClick={() => void navigate(`/experience/${id}/add-to`)}
                              >
                                Add to…
                              </MenuItem>
                              <MenuSeparator />
                              <MenuItem
                                icon={ConciergeStar2}
                                tone="emphasis"
                                onClick={() =>
                                  void navigate(
                                    `/library/trips/new?from=${encodeURIComponent(id)}`,
                                  )
                                }
                              >
                                Build Trip
                              </MenuItem>
                              <MenuSeparator />
                              {removeItems}
                            </>
                          }
                        />
                      }
                    />
                  )
                })}
              </ul>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
