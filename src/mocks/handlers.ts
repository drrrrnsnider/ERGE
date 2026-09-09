import { ApiRequestError } from '@/lib/api/schemas/error'
import type { Experience } from '@/lib/api/schemas/experience'
import { priceLowBound } from '@/lib/api/schemas/experience'
import type {
  CollageItems,
  ExploreFilters,
  ExploreLayout,
  SectionItems,
} from '@/lib/api/schemas/explore'
import { experiences } from './fixtures/experiences'

/**
 * Mock implementations of the `lib/api` signatures.
 *
 * Nothing outside src/mocks/ knows these exist: src/lib/api/explore.ts picks
 * them over the live client at the boundary, by environment flag. A component
 * never imports this file.
 *
 * They are slow on purpose (real networks are), and one of them fails on
 * purpose, because "cover the states, not just the happy path" is a rule of
 * this folder and a rail that never errors never gets its error state
 * designed.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

const byId = new Map(experiences.map((e) => [e.experienceId, e]))
const pick = (...ids: string[]): Experience[] =>
  ids.flatMap((id) => {
    const e = byId.get(id)
    return e ? [e] : []
  })

/**
 * The cold-start layout. `signal: 'none'` — this user has given the app
 * nothing, so every section is curated. Order matches the Explore frame.
 */
/* Every rail carries an href, because the keyframe draws the chevron on
 * every section heading except "Ideas for Your Trip" — the collage, which is
 * the one heading with no arrow. The chevron is not decoration: Rail renders
 * it only when there is somewhere to go, so an href missing here is the same
 * thing as a missing arrow on screen. */
const COLD_START: ExploreLayout = {
  signal: 'none',
  sections: [
    {
      kind: 'rail',
      id: 'date-nights-under-100',
      title: 'Date Nights Under $100',
      variant: 'media-md',
      href: '/search?collection=date-nights-under-100',
    },
    {
      kind: 'rail',
      id: 'popular-nearby',
      title: 'Popular Nearby',
      variant: 'media-sm',
      href: '/search?near=me',
    },
    {
      kind: 'rail',
      id: 'elite-experiences',
      title: 'Erge Elite Experiences',
      variant: 'media-md',
      href: '/search?collection=elite-experiences',
    },
    {
      kind: 'editorial',
      id: 'guides',
      content: {
        kind: 'guides',
        id: 'guides',
        badge: 'ERGE Guides',
        headline: 'The perfect experience for every occasion.',
        entries: [
          { id: 'date-night', label: 'Date Night', href: '/search?occasion=date-night' },
          { id: 'anniversary', label: 'Anniversary', href: '/search?occasion=anniversary' },
          { id: 'boys-night', label: 'Boys Night', href: '/search?occasion=boys-night' },
        ],
      },
    },
    { kind: 'collage', id: 'ideas-for-your-trip', title: 'Ideas for Your Trip' },
    {
      kind: 'editorial',
      id: 'equity-promo',
      content: {
        kind: 'promotion',
        id: 'equity-promo',
        badge: 'Promotion',
        headline: 'Earn equity with every experience you book.',
        caption: 'Limited time offer.',
        cta: { label: 'Learn more', href: '/promotions/equity' },
      },
    },
    {
      kind: 'rail',
      id: 'group-destinations',
      title: 'Group Destinations',
      variant: 'media-md',
      href: '/search?collection=group-destinations',
    },
    {
      kind: 'rail',
      id: 'unique-lodging',
      title: 'Unique Lodging',
      variant: 'media-sm-narrow',
      href: '/search?collection=unique-lodging',
    },
  ],
}

const POOLS: Record<string, Experience[]> = {
  'date-nights-under-100': pick(
    'exp-rooftop-picnic',
    'exp-jazz-club',
    'exp-sound-bath',
    'exp-tasting-menu',
  ),
  'popular-nearby': pick(
    'exp-sunset-sail',
    'exp-rooftop-picnic',
    'exp-jazz-club',
    'exp-ride-to-dinner',
  ),
  'elite-experiences': pick('exp-tasting-menu', 'exp-everglades', 'exp-rooftop-picnic'),
  'group-destinations': pick('exp-everglades', 'exp-sunset-sail', 'exp-houseboat'),
  'unique-lodging': pick('exp-houseboat', 'exp-glass-cabin', 'exp-bouquet'),
}

const LATENCY: Record<string, number> = {
  'date-nights-under-100': 300,
  'popular-nearby': 900,
  'elite-experiences': 500,
  'group-destinations': 1400,
  'unique-lodging': 700,
}

/**
 * "Unique Lodging" fails its first three attempts, then succeeds.
 *
 * Three, not one: the query client retries twice automatically, so a
 * fail-once mock would be retried into success and the error state would
 * never be seen. Three failures exhausts the automatic retries and shows the
 * ErrorState; the user's own "Try again" then succeeds. That exercises both
 * the error and the retry path from one fixture.
 */
let lodgingFailures = 0
const LODGING_FAILURES_BEFORE_SUCCESS = 3

/** Budget is a HARD filter (user-flows.md §0). `from` items use their low bound. */
function withinBudget(e: Experience, budget: ExploreFilters['budget']) {
  const low = priceLowBound(e.price)
  if (low.currency !== budget.currency) return false
  return low.amount >= budget.min && low.amount <= budget.max
}

export async function getExploreLayout(): Promise<ExploreLayout> {
  await delay(150)
  return COLD_START
}

export async function getExploreSection(
  id: string,
  filters: ExploreFilters,
): Promise<SectionItems> {
  await delay(LATENCY[id] ?? 400)

  if (id === 'unique-lodging' && lodgingFailures < LODGING_FAILURES_BEFORE_SUCCESS) {
    lodgingFailures++
    throw new ApiRequestError({
      code: 'vendor_unavailable',
      message: 'Lodging options couldn’t be loaded right now.',
      retryable: true,
      vendorId: 'stayco',
    })
  }

  const pool = POOLS[id] ?? []
  const items = pool.filter((e) => withinBudget(e, filters.budget))
  const vendors = [...new Set(pool.map((e) => e.vendorId))]
  return { items, sources: { answered: vendors, failed: [] } }
}

/** Cold start: a new user has no collections, so the collage is empty. */
export async function getExploreCollage(_id: string): Promise<CollageItems> {
  await delay(400)
  return { items: [] }
}
