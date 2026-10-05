import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  AccountBalance,
  ArrowBack,
  ConciergeStar2,
  DiscoverTune,
  ForkSpoon,
  LocalBar,
  LocalMall,
  RewardedAds,
  Spa,
} from '@/components/icons'
import {
  ExperienceCard,
  ExperienceCardSkeleton,
} from '@/components/app/experience-card'
import { MapPlaceholder } from '@/components/app/map-placeholder'
import { ButtonIcon } from '@/components/patterns/button'
import { SearchFilterRow } from '@/components/app/search-filter-row'
import { EmptyState } from '@/components/patterns/empty-state'
import { ErrorState } from '@/components/patterns/error-state'
import { FieldAction } from '@/components/patterns/field-action'
import { FieldPill } from '@/components/patterns/field-pill'
import { TabTextBar, type TabTextItem } from '@/components/patterns/tab-text-bar'
import { TopScrim } from '@/components/patterns/top-scrim'
import { getSearchResults } from '@/lib/api/search'
import { toApiError } from '@/lib/api/schemas/error'
import {
  SearchCategorySchema,
  locationFromNear,
  type SearchCategory,
  type SearchFilters,
} from '@/lib/api/schemas/search'

/**
 * Search results — a list of experiences over a map (Figma 230:8163).
 *
 * THE YELP SHAPE. The map is behind, the results are a sheet in front of it,
 * and scrolling the sheet up covers the map. That is done with ordinary
 * scrolling rather than a draggable sheet: the map is fixed behind a
 * transparent spacer, and the sheet begins below it, so the first scroll
 * slides the results over the map exactly as dragging would. It has no snap
 * points, which is the one thing a real drag would add — worth doing only if
 * the half-open resting position turns out to matter, and cheap to add later
 * because the sheet is already its own element.
 *
 * THE SEARCH IS IN THE URL; THE SIFTING IS NOT. `?q=` and `?category=` are
 * what you searched for, they survive a hard refresh, and the takeover gets
 * here by building one of these links — so a category-filtered list is
 * something you can send to someone. The chip row's budget, duration and
 * "right now" are component state, because they are how you are picking
 * through the answer at this moment rather than what you asked for. Move
 * them into the URL the day a sifted list is worth sharing.
 *
 * The dates the takeover collected are still not carried here at all.
 */

/* The row across the top. Order and icons are the design's; `all` has no
 * glyph there, which is why the icon is optional. */
const CATEGORIES: readonly TabTextItem[] = [
  { id: 'all', label: 'All' },
  { id: 'dining', label: 'Dining', icon: ForkSpoon },
  { id: 'drinks', label: 'Drinks', icon: LocalBar },
  { id: 'gifts', label: 'Gifts', icon: LocalMall },
  { id: 'tours', label: 'Tours', icon: AccountBalance },
  { id: 'sports', label: 'Sports', icon: RewardedAds },
  { id: 'spa', label: 'Spa', icon: Spa },
]

/* Wide enough not to hide anything. The real ceiling comes back with the
 * results, and the budget control on this screen is still to come. */
const WIDE_OPEN: SearchFilters['budget'] = {
  min: 0,
  max: 100_000_000,
  currency: 'USD',
}

export function SearchResultsRoute() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const query = params.get('q') ?? ''
  const location = locationFromNear(params.get('near'))

  /* Parsed rather than trusted: `?category=` is user-editable text, and an
   * unknown value should fall back to All rather than filtering to nothing. */
  const category: SearchCategory =
    SearchCategorySchema.safeParse(params.get('category')).data ?? 'all'

  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set())

  /* The chip row's filters are component state, not URL params, unlike the
   * query and the category. That is a deliberate split rather than an
   * oversight: q and category are what you SEARCHED FOR and are worth
   * sharing, while the chips are how you are sifting the answer right now.
   * Move them into the URL if a filtered list turns out to be worth sending
   * to someone. */
  const [refinements, setRefinements] = useState({
    budget: WIDE_OPEN,
    duration: 'any' as SearchFilters['duration'],
    availableNow: false,
  })

  const filters: SearchFilters = {
    query,
    location,
    dates: null,
    category,
    ...refinements,
  }

  const results = useQuery({
    queryKey: ['search', filters],
    queryFn: () => getSearchResults(filters),
  })

  const setCategory = (next: string) => {
    const copy = new URLSearchParams(params)
    if (next === 'all') copy.delete('category')
    else copy.set('category', next)
    /* `replace` so flicking along the category row does not bury the screen
     * you came from under seven history entries. */
    setParams(copy, { replace: true })
  }

  const toggleSave = (id: string) =>
    setSaved((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const items = results.data?.items ?? []

  return (
    <div className="relative h-full">
      {/* The map is FIXED behind the scrolling sheet rather than scrolling
        * with it, which is what makes the sheet read as sliding over it. */}
      <MapPlaceholder items={items} className="absolute inset-x-0 top-0 h-80" />

      {/* The summary bar floats over the map, above the sheet. It is the one
        * piece of chrome this screen keeps — see the takeover for why the
        * app's own top bar is gone.
        *
        * EXACTLY 4rem TALL, and that is load-bearing: pt-2 + the pill's h-12
        * + pb-2. The scroller below starts at `top-16` — the same 4rem — so
        * the two have to move together, which is why they are written within
        * sight of each other.
        *
        * The scrim is the design's `top bar gradient + blur`, and over a
        * real map it is what keeps the pill and the status bar legible. It
        * is NOT holding back scrolled content: the scroller is clipped below
        * this bar, so nothing passes behind it. Today's map placeholder is
        * dark enough that the scrim is hard to see doing its job. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-2 pb-2">
        <TopScrim />
        <FieldPill
          className="pointer-events-auto"
          leading={
            <button
              type="button"
              aria-label="Back to search"
              onClick={() => void navigate(-1)}
            >
              <ArrowBack />
            </button>
          }
          action={
            <ButtonIcon
              label="Ask the concierge"
              icon={ConciergeStar2}
              size="Sm"
              to="/concierge"
              className="bg-transparent"
            />
          }
        >
          {/* The two runs the results bar is built from: what you searched
            * for, and the scope it is searched in. Both are separately
            * editable, which is the whole reason they are two controls. */}
          <FieldAction
            tone="subject"
            name="Edit search"
            label={query === '' ? 'Everything' : query}
            to={`/search?q=${encodeURIComponent(query)}`}
          />
          {location === null ? null : (
            <FieldAction
              name="Change location"
              label={location}
              to="/search/location"
            />
          )}
        </FieldPill>
      </div>

      {/* The scroller. It STARTS BELOW THE SEARCH BAR rather than at the
        * top of the screen, which is the design's shape — its scroll area is
        * a frame beginning at y=118, just under the pill.
        *
        * That clip is what makes the sheet header pin correctly, and it is
        * why the header below can say `top-0` and mean it. The alternative,
        * leaving this `inset-0` and pushing the header down to `top-16`,
        * was tried and photographed: it leaves an 8px band between the
        * pill's bottom edge and the header where cards scroll past in full
        * view, and that band is exactly where the scrim's downward fade has
        * run out. Clipping removes the strip rather than trying to cover it.
        *
        * The spacer is transparent, so the map shows through until you
        * scroll. It is 4rem shorter than the bar is tall, which keeps the
        * sheet's resting edge where it was before the clip moved everything
        * down — it is a view onto the map, not a measurement of anything.
        *
        * `scroll-pt-29` is the sheet header's height, 116px — the same as
        * the design's `sticky` frame. Without it the browser treats the
        * scrollport's top edge as visible, so a control focused while tabbing
        * BACKWARDS was scrolled to exactly there and sat under the opaque
        * header: measured, 7 of 24 were fully hidden (WCAG 2.4.11). It is a
        * measurement of the header's contents, so it will go stale if they
        * change — the e2e test that tabs backwards is what notices. */}
      <div className="absolute inset-x-0 top-16 bottom-0 overflow-y-auto scroll-pt-29">
        <div aria-hidden="true" className="h-48 shrink-0" />

        <div className="min-h-full rounded-t-lg bg-background pb-8">
          {/* Sticky, so the categories and filters stay reachable however
            * far down the list you are.
            *
            * `top-0` is the top of the SCROLLPORT, and the scrollport now
            * begins below the search bar — so this pins under the pill, as
            * the design draws it. It used to be the top of the screen, where
            * the pill floats on z-20, so the handle, the categories and the
            * chips slid underneath it and vanished the moment the sheet
            * reached the top. */}
          {/* Figma 2340:3676. `shadow-lift` is the frame's 0 4 24 at 50%,
            * and it is what lifts the header off the cards scrolling under
            * it — the background alone is the same Surface/Base as the
            * sheet, so without it the two read as one surface.
            *
            * The spacing is the frame's, and it is uneven on purpose: the
            * handle sits directly on the categories, and the categories
            * carry 16px under them before the chips. Still 116px in all,
            * which is what `scroll-pt-29` on the scroller is measuring. */}
          <div className="sticky top-0 z-10 flex flex-col rounded-t-lg bg-background py-2 shadow-lift">
            {/* Purely a handle-shaped affordance: the sheet is scrolled, not
              * dragged, so there is nothing here to operate. Text/Disabled at
              * half strength, as drawn — a grip, not a separator. */}
            <span
              aria-hidden="true"
              className="mx-auto h-1 w-10 shrink-0 rounded-full bg-disabled-foreground/50"
            />

            <TabTextBar
              label="Category"
              items={CATEGORIES}
              value={category}
              onChange={setCategory}
              className="pb-4"
            />

            <SearchFilterRow
              filters={filters}
              onChange={({ budget, duration, availableNow }) =>
                setRefinements({ budget, duration, availableNow })
              }
              /* The ceiling comes back with the results rather than being
                * picked in advance, so "Any budget" means the most expensive
                * thing actually on offer. It only moves when the underlying
                * set does, because the API computes it BEFORE the budget
                * narrows anything. */
              ceiling={results.data?.ceiling ?? WIDE_OPEN.max}
            />
          </div>

          <div className="flex flex-col gap-4 px-4 pt-2">
            {results.isPending
              ? [0, 1, 2].map((i) => (
                  <ExperienceCardSkeleton key={i} variant="media-lg" />
                ))
              : null}

            {results.isError ? (
              <ErrorState
                error={toApiError(results.error)}
                onRetry={() => void results.refetch()}
              />
            ) : null}

            {results.isSuccess && items.length === 0 ? (
              <EmptyState
                icon={DiscoverTune}
                title="Nothing matched"
                description="Try a different category, or widen the search."
              />
            ) : null}

            {items.map((experience) => (
              <ExperienceCard
                key={experience.experienceId}
                experience={experience}
                variant="media-lg"
                saved={saved.has(experience.experienceId)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
