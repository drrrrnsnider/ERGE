import { useEffect, useId, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ArrowBack, Close, Event, History, LocationOnSm } from '@/components/icons'
import { BudgetRange } from '@/components/app/budget-range'
import { ButtonFlow } from '@/components/patterns/button-flow'
import { ChipFilter } from '@/components/patterns/chip-filter'
import { FieldAction } from '@/components/patterns/field-action'
import { FieldPill } from '@/components/patterns/field-pill'
import { addRecentSearch, getRecentSearches } from '@/lib/recents'
import type { ExploreFilters } from '@/lib/api/schemas/explore'

/**
 * The search takeover (Figma 230:8121).
 *
 * A FULL-SCREEN TAKEOVER, not a panel over Explore. The route renders under
 * `RootLayout chrome="takeover"`, which drops the top bar and the bottom
 * search row and keeps the tab bar — the design's framing, and the reason
 * the back arrow in the field is the only way out.
 *
 * WHAT IS REAL HERE AND WHAT IS NOT
 * ---------------------------------
 * Real: the query, the budget, clearing the location, the "Today" shortcut,
 * and recent searches, which persist across launches through lib/recents.
 *
 * Not yet: the date picker (its own step, with shadcn's range picker) and
 * the results screen. Pressing Enter navigates to `/search/results`, which
 * has no screen yet and so reports itself through the not-built route —
 * the app's standing way of letting a real link go somewhere honest rather
 * than dead-ending or silently doing nothing.
 *
 * THE INSET IS THE DESIGN'S. The search field sits at the page margin and
 * the location, date and budget rows are indented a further 16px inside it.
 * That is not an accident in the file — it reads as "these refine the thing
 * above" — so it is reproduced rather than flattened.
 */

/* The design's opening budget: nothing to $15,000, in minor units like
 * everywhere else. Wider than Explore's default because this screen is where
 * someone arrives with a real number in mind. */
const DEFAULT_BUDGET: ExploreFilters['budget'] = {
  min: 0,
  max: 1_500_000,
  currency: 'USD',
}

/** Where a search goes. Not built yet; the route reports what it got. */
const resultsHref = (query: string) =>
  `/search/results?q=${encodeURIComponent(query)}`

export function SearchRoute() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const queryId = useId()

  /* Both params make the deep link real rather than decorative: `?q=` opens
   * the takeover with the query already in the field, which is what going
   * back from results has to do, and `?near=` sets the location scope —
   * `me` is what Explore's location button sends, and any other value is
   * taken as a place name for when there is more than one to arrive with. */
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [location, setLocation] = useState<string | null>(() => {
    const near = params.get('near')
    if (near === null || near === 'me') return 'Current Location'
    return near
  })
  const [dates, setDates] = useState<string | null>(null)
  const [budget, setBudget] = useState(DEFAULT_BUDGET)

  /* `null` while storage is still answering. On a phone that is a real
   * moment — the value crosses a bridge to native code — so the section
   * renders nothing rather than flashing "no recent searches" and then
   * filling in. */
  const [recents, setRecents] = useState<string[] | null>(null)

  useEffect(() => {
    let live = true
    void getRecentSearches().then((list) => {
      if (live) setRecents(list)
    })
    /* Cleanup, so a promise that resolves after this screen has gone does
     * not set state on something that is no longer mounted. */
    return () => {
      live = false
    }
  }, [])

  const submit = async () => {
    const trimmed = query.trim()
    if (trimmed === '') return
    setRecents(await addRecentSearch(trimmed))
    void navigate(resultsHref(trimmed))
  }

  /** The × that drops the location, present only when there is one. */
  const clearLocation =
    location === null ? undefined : (
      <button
        type="button"
        aria-label={`Clear location: ${location}`}
        onClick={() => setLocation(null)}
        /* A dismiss button is exactly what CLAUDE.md names as a legitimate
         * 32px opt-out. It also has to be one here: the pill is 32px, so a
         * 44px target would hang 6px past it on both edges and overlap the
         * rows above and below it. */
        data-target="compact"
        className="grid size-8 place-items-center rounded-full text-primary"
      >
        <Close />
      </button>
    )

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex flex-col gap-3 px-4 pt-2">
        <FieldPill
          leading={
            <button
              type="button"
              aria-label="Close search"
              /* -1 rather than a route, so it returns wherever you came
               * from. Someone who opened search from Library should land
               * back in Library, not on Explore. */
              onClick={() => void navigate(-1)}
            >
              <ArrowBack />
            </button>
          }
        >
          <label htmlFor={queryId} className="sr-only">
            Search experiences
          </label>
          <input
            id={queryId}
            type="search"
            /* autoFocus because this screen exists only to be typed into —
             * it is a takeover opened by tapping a search field, so the
             * keyboard should already be up. */
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submit()
            }}
            placeholder="Oysters and drinks for under $100"
            className="h-full min-w-0 flex-1 bg-transparent text-body-md text-foreground outline-none placeholder:text-muted-foreground"
          />
        </FieldPill>

        {/* The further 16px inset the design draws — see the note above. */}
        <div className="flex flex-col gap-3 px-4">
          <FieldPill size="Sm" leading={<LocationOnSm />} action={clearLocation}>
            <span
              className={
                location === null ? 'text-muted-foreground' : 'text-primary'
              }
            >
              {location ?? 'Add location'}
            </span>
          </FieldPill>

          <FieldPill
            size="Sm"
            leading={<Event />}
            action={
              <FieldAction
                name="Set dates to today"
                label="Today"
                onClick={() => setDates('Today')}
              />
            }
          >
            {/* Static for now. The picker is its own step; when it lands
              * this becomes the trigger that opens it, and it is left inert
              * rather than wired to a button that does nothing. */}
            <span
              className={dates === null ? 'text-muted-foreground' : 'text-foreground'}
            >
              {dates ?? 'Set dates'}
            </span>
          </FieldPill>

          <BudgetRange variant="compact" value={budget} onChange={setBudget} />
        </div>

        {/* Centred, as the design has it — the one control on this screen
          * that is an offer rather than a filter. */}
        <div className="flex justify-center pt-1">
          <ButtonFlow size="SM" onClick={() => void navigate('/concierge')} />
        </div>
      </div>

      {recents !== null && recents.length > 0 ? (
        <section aria-labelledby="recent-searches" className="flex flex-col gap-2">
          <h2
            id="recent-searches"
            className="px-4 text-h4 font-medium text-foreground"
          >
            Recently searched
          </h2>
          {/* Wraps rather than scrolls: the design draws two rows, and a
            * short list of words is easier to read wrapped than swiped. */}
          <div className="flex flex-wrap gap-2 px-4">
            {recents.map((recent) => (
              <ChipFilter
                key={recent}
                label={recent}
                icon={History}
                to={resultsHref(recent)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
