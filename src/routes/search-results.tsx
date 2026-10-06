import { useQuery } from '@tanstack/react-query'
import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  AccountBalance,
  ArrowBack,
  ConciergeStar,
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
import { SearchFilterRow } from '@/components/app/search-filter-row'
import { EmptyState } from '@/components/patterns/empty-state'
import { ErrorState } from '@/components/patterns/error-state'
import { FieldAction, FieldIconAction } from '@/components/patterns/field-action'
import { FieldPill } from '@/components/patterns/field-pill'
import { TabTextBar, type TabTextItem } from '@/components/patterns/tab-text-bar'
import { TopScrim } from '@/components/patterns/top-scrim'
import { getSearchResults } from '@/lib/api/search'
import { toApiError } from '@/lib/api/schemas/error'
import { useSaved } from '@/lib/use-saved'
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
 * and the sheet rests at one of three heights (Figma 2345:4201 is the
 * lowest): COLLAPSED, just its header sitting on the tab bar over a full
 * map; HALF, where it opens, map above and results below; and FULL, header
 * pinned under the search pill, results scrolling beneath it.
 *
 * Done with ordinary scrolling and CSS scroll snapping, not a drag library.
 * The map is fixed behind a transparent spacer and the sheet begins below
 * it, so scrolling slides the sheet over the map exactly as dragging would,
 * with the platform's own touch momentum — and `scroll-snap` makes that
 * scroll come to rest only at the three heights. See the scroller below.
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
  /* Labelled Wellness, as the design has it, while the id stays `spa`:
   * the id is the API's category and the `?category=` value, and renaming
   * it would break every link already made with it. */
  { id: 'spa', label: 'Wellness', icon: Spa },
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

  const saved = useSaved()

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


  const items = results.data?.items ?? []

  /* Open at HALF. Before paint, so the sheet never shows at collapsed first
   * and then jumps. Measured from the half snap point itself, less the
   * scroll padding, so it lands exactly on the snap and stays there; it does
   * not re-run when results arrive, because the spacer does not depend on
   * them. */
  const scrollerRef = useRef<HTMLDivElement>(null)
  const halfRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const half = halfRef.current
    if (scroller === null || half === null) return
    const padding = parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0
    scroller.scrollTop = half.offsetTop - padding
  }, [])

  return (
    <div className="relative h-full">
      {/* The map is FIXED behind the scrolling sheet rather than scrolling
        * with it, which is what makes the sheet read as sliding over it. */}
      {/* Full height, so the collapsed sheet has a whole map above it. */}
      <MapPlaceholder items={items} className="absolute inset-0" />

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
          /* Both ends are bare glyphs, as drawn (168:2519): no ring, no
           * fill. The back arrow is Text/Primary here, not the slot's
           * copper — sampled from the rendered design. */
          leading={
            <FieldIconAction
              label="Back to search"
              icon={ArrowBack}
              onClick={() => void navigate(-1)}
              className="text-foreground"
            />
          }
          action={
            <FieldIconAction
              label="Ask the concierge"
              icon={ConciergeStar}
              to="/concierge"
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
              tone="scope"
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
        * THREE RESTING HEIGHTS, by scroll snapping. `snap-mandatory` means
        * a scroll always comes to rest on a snap point, and there are three:
        *
        *   collapsed  scrollTop 0: the spacer fills all but --peek of the
        *              scroller, so only the sheet's header shows, on the
        *              tab bar — 1px LOWER than flush, so the header's own
        *              bottom border falls just outside the scroller and is
        *              clipped. Flush, it sat on the tab bar's top border
        *              and the two read as one doubled line
        *   half       the sheet's top edge at the scroller's middle. Where
        *              the screen opens — see the layout effect
        *   full       the RESULTS LIST's top: the header pinned, results
        *              below it
        *
        * The third is what keeps the results scrollable. The list is taller
        * than the screen, and a snap target taller than the screen may be
        * scrolled through freely — the browser only snaps at its edges. So
        * snapping governs the sheet's height and nothing else.
        *
        * Each snap point sits --peek LOWER than the position it means,
        * because the scroll padding below (the header's height, for focus)
        * also moves where a snap lands: a target aligns to the top of the
        * padded area, not of the scroller. Hence the first spacer block,
        * --peek tall, with no snap of its own.
        *
        * --peek is the header's height, set once here; the spacer, the snap
        * offsets and the focus padding all read it. On desktop a mouse
        * cannot drag a scroller, so there the wheel or trackpad moves the
        * sheet, and it snaps the same.
        *
        * The scroll padding is the sheet header's height: 116px, the design's
        * `sticky` frame, plus its 1px bottom border. Figma draws that stroke
        * inside the frame without adding height; CSS adds it, hence the
        * `+1px`. Without the padding the browser treats the scrollport's top
        * edge as visible, so a control focused while tabbing BACKWARDS was
        * scrolled to exactly there and sat under the opaque header:
        * measured, 7 of 24 were fully hidden (WCAG 2.4.11). It is a
        * measurement of the header's contents, so it will go stale if they
        * change — the e2e test that tabs backwards is what notices. It
        * cannot see the border's single pixel, though: it passes with or
        * without the `+1px`, which is there because it is the geometry,
        * not because a test demanded it.
        *
        * ROUNDED, to the header's own radius. A scrolling box clips its
        * content to its rounded edge, so cards passing under the pinned
        * header are cropped to its corners instead of showing through the
        * gaps beside them — the sheet keeps its shape all the way up. At
        * rest the corners only clip the transparent window onto the map,
        * which shows the same thing either way. */}
      <div
        ref={scrollerRef}
        data-slot="results-sheet"
        className="absolute inset-x-0 top-16 bottom-0 snap-y snap-mandatory overflow-y-auto rounded-t-lg [--peek:calc(--spacing(29)+1px)] scroll-pt-(--peek)"
      >
        <div aria-hidden="true" className="h-(--peek)" />
        {/* Snap: collapsed. The extra 1px is the hidden border — see above.
          * It is added here, before the half point, so half and full do not
          * move. */}
        <div aria-hidden="true" className="h-[calc(50%-var(--peek)+1px)] snap-start" />
        {/* Snap: half. */}
        <div ref={halfRef} aria-hidden="true" className="h-[calc(50%-var(--peek))] snap-start" />

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
            * plus the 1px border, which is what the scroller's scroll padding
            * is measuring. */}
          <div className="sticky top-0 z-10 flex flex-col rounded-t-lg border-b border-border-subtle bg-background py-2 shadow-lift">
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

          {/* Snap: full. The list is taller than the screen, so beyond this
            * point it scrolls freely. */}
          <div className="flex snap-start flex-col gap-4 px-4 pt-2">
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
                saved={saved.isSaved(experience.experienceId)}
                onToggleSave={saved.toggle}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
