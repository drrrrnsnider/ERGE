import { useQuery } from '@tanstack/react-query'
import { Bookmark, Search } from 'lucide-react'
import { useId, useState } from 'react'
import { EditorialCard } from '@/components/app/editorial-card'
import {
  ExperienceCard,
  ExperienceCardSkeleton,
} from '@/components/app/experience-card'
import { BudgetGroupControls } from '@/components/app/budget-group-controls'
import { Rail, RailItem, RailScroller, RailState } from '@/components/app/rail'
import { EmptyState } from '@/components/patterns/empty-state'
import { ErrorState } from '@/components/patterns/error-state'
import { Skeleton } from '@/components/patterns/skeleton'
import {
  getExploreCollage,
  getExploreLayout,
  getExploreSection,
} from '@/lib/api/explore'
import { toApiError } from '@/lib/api/schemas/error'
import type {
  ExploreFilters,
  ExploreSection,
  RailVariant,
} from '@/lib/api/schemas/explore'

/**
 * Explore — the first screen, and the cold-start screen.
 *
 * STATES ARE PER-SECTION, NOT PER-PAGE. Each rail owns its own query, so it
 * loads, fails and empties independently. Up to ten providers answer this
 * app; one timing out while the others succeed is an operating condition,
 * not an error (api-contract.md). A page-level spinner would hide four
 * healthy rails behind one slow one, and a page-level error would throw them
 * away. "Unique Lodging" in the mocks fails on purpose so that path is real.
 *
 * COLD START is the default, not a fallback. A signed-out user — which is
 * everyone, since preferences only exist against an account (user-flows.md
 * §5–6) — has given the app nothing. So the layout is entirely curated, and
 * nothing on this screen asks the user to teach it anything. "Ideas for Your
 * Trip" renders a real empty state, because a new user has no trips.
 *
 * Query keys live here rather than in lib/api, per that folder's README:
 * the API layer stays free of React so it can be tested as plain functions.
 */

/** Budget is a hard filter; this default is wide enough not to hide the app. */
const DEFAULT_FILTERS: ExploreFilters = {
  budget: { min: 0, max: 50_000, currency: 'USD' },
  groupSize: 2,
}

const queryKeys = {
  layout: ['explore', 'layout'] as const,
  section: (id: string, filters: ExploreFilters) =>
    ['explore', 'section', id, filters] as const,
  collage: (id: string) => ['explore', 'collage', id] as const,
}

export function ExploreRoute() {
  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_FILTERS)
  const searchId = useId()

  const layout = useQuery({
    queryKey: queryKeys.layout,
    queryFn: getExploreLayout,
  })

  return (
    <div className="flex flex-col gap-6 pb-8">
      <header className="flex items-center justify-center px-4 pt-4">
        <h1 className="text-xl font-semibold tracking-[0.3em] text-foreground">
          ERGE
        </h1>
      </header>

      {/* An active field with no submit — search itself is not built. Kept as
        * a real labelled input rather than a button so the affordance is
        * honest about being a text field. */}
      <search className="px-4">
        <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2">
          <Search className="size-5 text-muted-foreground" aria-hidden="true" />
          <label htmlFor={searchId} className="sr-only">
            Search experiences
          </label>
          <input
            id={searchId}
            type="search"
            placeholder="What's your ERGE?"
            className="h-9 min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </search>

      <div className="px-4">
        <BudgetGroupControls value={filters} onChange={setFilters} />
      </div>

      {layout.isPending ? (
        <RailState>
          <Skeleton className="h-6 w-40" />
        </RailState>
      ) : null}

      {layout.isError ? (
        <RailState>
          <ErrorState
            error={toApiError(layout.error)}
            onRetry={() => void layout.refetch()}
          />
        </RailState>
      ) : null}

      {layout.data?.sections.map((section) => (
        <Section key={section.id} section={section} filters={filters} />
      ))}
    </div>
  )
}

function Section({
  section,
  filters,
}: {
  section: ExploreSection
  filters: ExploreFilters
}) {
  if (section.kind === 'editorial') {
    return <EditorialCard content={section.content} />
  }
  if (section.kind === 'collage') {
    return <CollageSection id={section.id} title={section.title} />
  }
  return (
    <RailSection
      id={section.id}
      title={section.title}
      variant={section.variant}
      href={section.href}
      badge={section.badge}
      filters={filters}
    />
  )
}

/**
 * One rail, bound to its own query. Everything about its state — loading,
 * error, empty, populated — is decided here and affects nothing else on the
 * page.
 */
function RailSection({
  id,
  title,
  variant,
  href,
  badge,
  filters,
}: {
  id: string
  title: string
  variant: RailVariant
  href?: string
  badge?: string
  filters: ExploreFilters
}) {
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set())
  const query = useQuery({
    queryKey: queryKeys.section(id, filters),
    queryFn: () => getExploreSection(id, filters),
  })

  const toggleSave = (experienceId: string) =>
    setSaved((current) => {
      const next = new Set(current)
      if (next.has(experienceId)) next.delete(experienceId)
      else next.add(experienceId)
      return next
    })

  return (
    <Rail id={id} title={title} href={href}>
      {/* aria-busy tells assistive tech this region is still filling in,
        * which is why the individual skeleton blocks are aria-hidden. */}
      {query.isPending ? (
        <RailScroller aria-busy="true">
          {[0, 1, 2].map((i) => (
            <RailItem key={i}>
              <ExperienceCardSkeleton variant={variant} />
            </RailItem>
          ))}
        </RailScroller>
      ) : null}

      {query.isError ? (
        <RailState>
          <ErrorState
            error={toApiError(query.error)}
            onRetry={() => void query.refetch()}
          />
        </RailState>
      ) : null}

      {query.isSuccess && query.data.items.length === 0 ? (
        <RailState>
          <EmptyState
            title="Nothing in this range"
            description="Widen the budget to see more here."
          />
        </RailState>
      ) : null}

      {query.isSuccess && query.data.items.length > 0 ? (
        <RailScroller>
          {query.data.items.map((experience) => (
            <RailItem key={experience.experienceId}>
              <ExperienceCard
                experience={experience}
                variant={variant}
                badge={badge}
                saved={saved.has(experience.experienceId)}
                onToggleSave={toggleSave}
              />
            </RailItem>
          ))}
        </RailScroller>
      ) : null}
    </Rail>
  )
}

/**
 * "Ideas for Your Trip" — drawn from the user's own collections, so on cold
 * start it is empty by definition. That empty state is the designed one, and
 * it says what to do rather than that nothing is there.
 */
function CollageSection({ id, title }: { id: string; title: string }) {
  const query = useQuery({
    queryKey: queryKeys.collage(id),
    queryFn: () => getExploreCollage(id),
  })

  return (
    <Rail id={id} title={title}>
      {query.isPending ? (
        <RailState>
          <Skeleton className="h-28 w-full rounded-xl" />
        </RailState>
      ) : null}

      {query.isError ? (
        <RailState>
          <ErrorState
            error={toApiError(query.error)}
            onRetry={() => void query.refetch()}
          />
        </RailState>
      ) : null}

      {query.isSuccess && query.data.items.length === 0 ? (
        <RailState>
          <EmptyState
            icon={Bookmark}
            title="No trips yet"
            description="Save an experience and it starts a trip you can build on."
          />
        </RailState>
      ) : null}

      {query.isSuccess && query.data.items.length > 0 ? (
        <div className="px-4">
          <ul className="grid grid-cols-4 gap-1 overflow-hidden rounded-xl">
            {query.data.items.map((item) => (
              <li key={item.experienceId} className="aspect-square bg-muted">
                {item.images[0] ? (
                  <img
                    src={item.images[0].url}
                    alt={item.images[0].alt}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : null}
              </li>
            ))}
          </ul>
          {query.data.caption ? (
            <p className="pt-2 text-sm text-muted-foreground">
              {query.data.caption}
            </p>
          ) : null}
        </div>
      ) : null}
    </Rail>
  )
}
