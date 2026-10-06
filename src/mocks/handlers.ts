import { ApiRequestError } from '@/lib/api/schemas/error'
import type {
  Experience,
  ExperienceBand,
  ExperienceCategory,
} from '@/lib/api/schemas/experience'
import { priceLowBound } from '@/lib/api/schemas/experience'
import type {
  DurationBand,
  SearchCategory,
  SearchFilters,
  SearchResults,
} from '@/lib/api/schemas/search'
import type {
  CollageItems,
  ExploreFilters,
  ExploreLayout,
  SectionItems,
} from '@/lib/api/schemas/explore'
import {
  CollectionSchema,
  type Collection,
  type CollectionItem,
  type CollectionKind,
  type CollectionSummaryList,
} from '@/lib/api/schemas/collection'
import { readJSON, writeJSON } from '@/lib/storage'
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

/**
 * Lookup by id, in the order asked for.
 *
 * Unknown ids fall out rather than erroring — that is the real behaviour
 * being modelled, since a recently-viewed id can outlive its experience.
 * Faster than a search because it is a lookup, not a fan-out.
 */
export async function getExperiencesByIds(
  ids: readonly string[],
): Promise<{ items: Experience[] }> {
  await delay(200)
  return { items: pick(...ids) }
}

/* ===================================================================== *
 * Search
 * ===================================================================== */

/**
 * The category row's names, mapped onto what an experience actually is.
 *
 * Every row entry now has a home: `drinks` and `sports` were added to
 * `ExperienceCategory` rather than being folded into `dining` and `event`,
 * so this is a plain rename rather than a lossy one. The two vocabularies
 * still exist — one says what a thing IS, the other what you filter BY — and
 * this is the single place they meet.
 */
const CATEGORY_MAP: Record<SearchCategory, readonly ExperienceCategory[]> = {
  all: [],
  dining: ['dining'],
  drinks: ['drinks'],
  gifts: ['gift'],
  tours: ['tour'],
  sports: ['sports'],
  spa: ['wellness'],
}

/**
 * Minutes out of a free-text duration — "90 min", "3 hrs", "2.5 hrs",
 * "3–4 hours". Takes the FIRST number, so a range reports its low end.
 *
 * A MOCK'S JOB, not a contract. `Experience` has no structured duration, so
 * something has to turn the label/value pair into a number; a real API would
 * send minutes and this function would not exist. See schemas/search.ts.
 */
function durationMinutes(e: Experience): number | null {
  const raw = e.details.find((d) => d.label === 'Duration')?.value
  if (raw === undefined) return null
  const match = /(\d+(?:\.\d+)?)/.exec(raw)
  if (match?.[1] === undefined) return null
  const value = Number(match[1])
  return /min/i.test(raw) ? value : value * 60
}

const BANDS: Record<DurationBand, (minutes: number) => boolean> = {
  any: () => true,
  'under-1h': (m) => m < 60,
  '1-2h': (m) => m >= 60 && m < 120,
  '2-4h': (m) => m >= 120 && m < 240,
  '4h-plus': (m) => m >= 240,
}

function withinDuration(e: Experience, band: DurationBand) {
  if (band === 'any') return true
  const minutes = durationMinutes(e)
  /* No duration means it cannot answer the question, so it drops out rather
   * than being included on a technicality. */
  return minutes === null ? false : BANDS[band](minutes)
}

/** Naive substring matching. A real search ranks; this only has to filter. */
function matchesQuery(e: Experience, query: string) {
  const q = query.trim().toLowerCase()
  if (q === '') return true
  return [e.title, e.summary, e.location.address]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(q))
}

export async function getSearchResults(
  filters: SearchFilters,
): Promise<SearchResults> {
  await delay(450)

  const matching = experiences.filter(
    (e) =>
      matchesQuery(e, filters.query) &&
      withinCategory(e, filters.category) &&
      withinDuration(e, filters.duration) &&
      (!filters.availableNow || e.availability.status === 'available'),
  )

  /* The ceiling comes from what MATCHED, before the budget narrows it —
   * otherwise the track would shrink to the range you already chose, which
   * is the trap BudgetRange was just fixed to avoid. */
  const ceiling = matching.reduce(
    (high, e) => Math.max(high, priceLowBound(e.price).amount),
    0,
  )

  const items = matching.filter((e) => withinBudget(e, filters.budget))
  const vendors = [...new Set(matching.map((e) => e.vendorId))]
  return { items, ceiling, sources: { answered: vendors, failed: [] } }
}

function withinCategory(e: Experience, category: SearchCategory) {
  const allowed = CATEGORY_MAP[category]
  if (category === 'all') return true
  return allowed.includes(e.category)
}

/** One experience, or a not_found the detail screen can render. */
export async function getExperience(id: string): Promise<Experience> {
  await delay(250)
  const found = byId.get(id)
  if (found === undefined) {
    throw new ApiRequestError({
      code: 'not_found',
      message: 'That experience is no longer listed.',
      retryable: false,
    })
  }
  return found
}

/* ===================================================================== *
 * Pairings
 * ===================================================================== */

/**
 * Hand-picked companions for a few anchors. Everything else pairs with
 * nothing, which is a real answer and leaves the section off the screen.
 *
 * The picnic's set includes Ride to Dinner, which has no photo, on purpose:
 * the band has to hold an empty column rather than close the gap.
 */
const PAIRINGS: Record<string, readonly string[]> = {
  'exp-rooftop-picnic': ['exp-rooftop-cocktails', 'exp-jazz-club', 'exp-ride-to-dinner'],
  'exp-tasting-menu': ['exp-ride-to-dinner', 'exp-rooftop-cocktails', 'exp-jazz-club'],
  'exp-sunset-sail': ['exp-tasting-menu', 'exp-rooftop-cocktails', 'exp-bouquet'],
}

/**
 * FAILS ON PURPOSE for the houseboat, so the section's own error state is
 * exercised rather than theoretical — the same reason Unique Lodging fails
 * on Explore. The rest of the detail screen must stay up when it does.
 */
export async function getPairings(id: string): Promise<ExperienceBand> {
  await delay(350)
  if (id === 'exp-houseboat') {
    throw new ApiRequestError({
      code: 'timeout',
      message: 'Suggestions took too long to come back.',
      retryable: true,
    })
  }
  return {
    items: pick(...(PAIRINGS[id] ?? [])).map(({ experienceId, title, images }) => ({
      experienceId,
      title,
      images,
    })),
  }
}

/* ===================================================================== *
 * Collections — Saved
 * ===================================================================== */

/**
 * The saved collection, kept on this device.
 *
 * THE ONE MOCK THAT REMEMBERS. Everything else in this file is fixed data;
 * saving has to survive a reload or it is not saving, so this writes through
 * lib/storage. That is a property of the MOCK, not of the design: the
 * contract puts collections server-side (api-contract.md, Anonymous carts),
 * and when the real endpoint arrives this block is deleted and nothing above
 * lib/api notices. Until then saves are per-device, like recents.
 *
 * Its own storage key, prefixed `mock`, so a real build never reads what a
 * mock one wrote and mistakes it for server data.
 */
const SAVED_KEY = 'erge.mock.saved.v1'
const SAVED_ID = 'saved-this-device'

const emptySaved = (): Collection => ({
  collectionId: SAVED_ID,
  kind: 'saved',
  active: true,
  items: [],
})

/* Sorted on the way out as well as on the way in, so the contract's
 * newest-first holds even for a value this version did not write. */
async function readSaved(): Promise<Collection> {
  const stored = await readJSON(SAVED_KEY, CollectionSchema)
  return stored ? { ...stored, items: newestFirst(stored.items) } : emptySaved()
}

/**
 * One write at a time. Every change is read, modify, write — and storage is
 * async — so two quick taps could both read the same list and the second
 * write would quietly undo the first. A real server serialises for us; this
 * stands in for that.
 */
let writes: Promise<unknown> = Promise.resolve()
function serially<T>(change: () => Promise<T>): Promise<T> {
  const next = writes.then(change, change)
  writes = next.catch(() => undefined)
  return next
}

/** Newest first — the order every collection list draws in. */
const newestFirst = (items: CollectionItem[]) =>
  [...items].sort((a, b) => b.addedAt.localeCompare(a.addedAt))

export async function getActiveCollection(
  kind: CollectionKind,
): Promise<Collection> {
  await delay(150)
  if (kind !== 'saved') {
    throw new ApiRequestError({
      code: 'not_found',
      message: `No ${kind} collections are mocked yet.`,
      retryable: false,
    })
  }
  return readSaved()
}

/**
 * One collection by id, and a way to write it back — Saved, or any
 * wishlist. Everything below works through this, so a change to how a kind
 * is stored is a change here only.
 */
async function openCollection(collectionId: string): Promise<{
  collection: Collection
  write: (next: Collection) => Promise<void>
}> {
  if (collectionId === SAVED_ID) {
    return { collection: await readSaved(), write: (next) => writeJSON(SAVED_KEY, next) }
  }
  const wishlists = await readWishlists()
  const found = wishlists.find((c) => c.collectionId === collectionId)
  if (found === undefined) {
    throw new ApiRequestError({
      code: 'not_found',
      message: 'That collection does not exist.',
      retryable: false,
    })
  }
  return {
    collection: found,
    write: (next) =>
      writeJSON(
        WISHLISTS_KEY,
        wishlists.map((c) => (c.collectionId === collectionId ? next : c)),
      ),
  }
}

/**
 * A wishlist as it is SHOWN: only what is still saved. A wishlist is a way
 * of sorting saved things (Darrin, 2026-10-06), so unsaving hides an
 * experience from every wishlist — without deleting the membership, which
 * is what lets Undo, from any screen, bring it back everywhere just by
 * saving it again. See api-contract.md, `GET /collections/:id`.
 */
async function visible(collection: Collection): Promise<Collection> {
  if (collection.kind === 'saved') return collection
  const saved = new Set((await readSaved()).items.map((i) => i.experienceId))
  return { ...collection, items: collection.items.filter((i) => saved.has(i.experienceId)) }
}

/** `GET /collections/:id` — one collection, whole. */
export async function getCollection(collectionId: string): Promise<Collection> {
  await delay(200)
  return visible((await openCollection(collectionId)).collection)
}

/**
 * Put an experience in. Idempotent: putting in something already there
 * changes nothing, including when it went in — so a double tap cannot
 * reorder the list.
 *
 * `addedAt` is honoured when sent. That is Undo: it hands back the item as it
 * was, so it returns to its old place rather than jumping to the top.
 *
 * Into a wishlist, it is saved as well: everything in a wishlist is saved,
 * and this keeps that true however the wishlist was reached.
 */
export async function putCollectionItem(
  collectionId: string,
  item: { experienceId: string; addedAt?: string },
): Promise<Collection> {
  await delay(150)
  return serially(async () => {
    const { collection, write } = await openCollection(collectionId)
    if (collection.kind !== 'saved') {
      await ensureSaved(item.experienceId)
    }
    if (collection.items.some((i) => i.experienceId === item.experienceId)) {
      return visible(collection)
    }
    const next: Collection = {
      ...collection,
      items: newestFirst([
        ...collection.items,
        {
          experienceId: item.experienceId,
          addedAt: item.addedAt ?? new Date().toISOString(),
          selected: false,
        },
      ]),
    }
    await write(next)
    return visible(next)
  })
}

async function ensureSaved(experienceId: string) {
  const saved = await readSaved()
  if (saved.items.some((i) => i.experienceId === experienceId)) return
  await writeJSON(SAVED_KEY, {
    ...saved,
    items: newestFirst([
      ...saved.items,
      { experienceId, addedAt: new Date().toISOString(), selected: false },
    ]),
  })
}

/**
 * Take one out. Removing something that is not there is not an error.
 *
 * Out of Saved is "Delete from Library": it disappears from every wishlist
 * too, by `visible` hiding it rather than by deleting its memberships.
 * Out of a wishlist is "Remove from Wishlist": that wishlist only, and it
 * stays saved.
 */
export async function deleteCollectionItem(
  collectionId: string,
  experienceId: string,
): Promise<Collection> {
  await delay(150)
  return serially(async () => {
    const { collection, write } = await openCollection(collectionId)
    const next: Collection = {
      ...collection,
      items: collection.items.filter((i) => i.experienceId !== experienceId),
    }
    await write(next)
    return visible(next)
  })
}

/* ===================================================================== *
 * Collections — Wishlists
 * ===================================================================== */

/**
 * Wishlists, kept on this device the same way Saved is, and for the same
 * reason: they are made by the person, so they have to survive a reload.
 *
 * There are no fixture wishlists. A first run has none, and the grid's
 * empty state is the real first-run state — seeding some would hide it.
 * They are created from the experience page ("Add to → Wishlist → New"),
 * which is not built yet; until then tests write them straight into
 * storage under this key.
 */
const WISHLISTS_KEY = 'erge.mock.wishlists.v1'

async function readWishlists(): Promise<Collection[]> {
  const stored = await readJSON(WISHLISTS_KEY, CollectionSchema.array())
  return (stored ?? []).map((c) => ({ ...c, items: newestFirst(c.items) }))
}

/**
 * One card per collection: name, count, and a cover taken from the most
 * recently added experience that has a picture. A real server would keep
 * the cover with the collection; here it is worked out on the way out.
 */
export async function listCollections(
  kind: CollectionKind,
): Promise<CollectionSummaryList> {
  await delay(200)
  if (kind !== 'wishlist') {
    throw new ApiRequestError({
      code: 'not_found',
      message: `Listing ${kind} collections is not mocked yet.`,
      retryable: false,
    })
  }
  const wishlists = await Promise.all((await readWishlists()).map(visible))
  return {
    items: wishlists.map((c) => ({
      collectionId: c.collectionId,
      kind: c.kind,
      name: c.name ?? 'Untitled',
      itemCount: c.items.length,
      cover: c.items
        .map((i) => byId.get(i.experienceId)?.images[0])
        .find((image) => image !== undefined),
    })),
  }
}

/**
 * What else might go in a collection — a wishlist's "Suggested Additions".
 *
 * A MOCK'S GUESS: the catalogue, minus what is already in it, newest
 * fixtures first, five at most. A real server would rank by the
 * collection's taste, the user's budget and what is nearby; the screen
 * only needs the list.
 *
 * Empty is an answer — everything suggestible is already in it — and the
 * screen leaves the section out rather than showing an empty state.
 */
export async function getCollectionSuggestions(
  collectionId: string,
): Promise<{ items: Experience[] }> {
  await delay(300)
  const { collection } = await openCollection(collectionId)
  const inIt = new Set(collection.items.map((i) => i.experienceId))
  return { items: experiences.filter((e) => !inIt.has(e.experienceId)).slice(0, 5) }
}
