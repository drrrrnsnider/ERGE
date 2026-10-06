import * as mocks from '@/mocks/handlers'
import { ApiRequestError } from './schemas/error'
import {
  CollectionSchema,
  CollectionSummaryListSchema,
  type Collection,
  type CollectionKind,
  type CollectionSummaryList,
} from './schemas/collection'
import { ExperienceListSchema, type ExperienceList } from './schemas/experience'

/**
 * Collections — Cart, Trip, Wishlist, List and Saved through one set of
 * calls, because they are one shape (schemas/collection.ts).
 *
 * Backed today: Saved, and the list of wishlists. The calls take a kind or
 * an id anyway, so the next collection to be built adds a mock, not a
 * second API.
 *
 * Same boundary rules as explore.ts — mock or live chosen by VITE_API_MODE,
 * every response parsed at the edge, no React in the file. The hook screens
 * use is lib/use-saved.ts.
 */

const MODE = (import.meta.env.VITE_API_MODE as string | undefined) ?? 'mock'

function live(): never {
  throw new ApiRequestError({
    code: 'unknown',
    message: 'No live API is configured yet.',
    retryable: false,
  })
}

/**
 * `GET /collections/active?kind=…` — this user's current one of a kind.
 *
 * "Active", not "the", because the contract models a collection as an id
 * plus an `active` flag rather than a singleton, so that [V2] multiple saved
 * carts is a data change. For Saved there is only ever one.
 */
export async function getActiveCollection(
  kind: CollectionKind,
): Promise<Collection> {
  const raw = MODE === 'mock' ? await mocks.getActiveCollection(kind) : live()
  return CollectionSchema.parse(raw)
}

/**
 * `PUT /collections/:collectionId/items/:experienceId` — put one in.
 *
 * PUT because it is idempotent: saving twice is the same as saving once.
 * Pass `addedAt` only to RESTORE an item you removed — Undo — so it goes
 * back where it was. Leave it out and the server stamps the time.
 *
 * Returns the whole collection as it now stands, so the caller can replace
 * its copy rather than guessing.
 */
export async function putCollectionItem(
  collectionId: string,
  item: { experienceId: string; addedAt?: string },
): Promise<Collection> {
  const raw =
    MODE === 'mock' ? await mocks.putCollectionItem(collectionId, item) : live()
  return CollectionSchema.parse(raw)
}

/** `DELETE /collections/:collectionId/items/:experienceId` — take one out. */
export async function deleteCollectionItem(
  collectionId: string,
  experienceId: string,
): Promise<Collection> {
  const raw =
    MODE === 'mock'
      ? await mocks.deleteCollectionItem(collectionId, experienceId)
      : live()
  return CollectionSchema.parse(raw)
}

/**
 * `GET /collections?kind=…` — every collection of a kind, as cards.
 *
 * Summaries, not full collections: what `Card / List MD` draws is a name, a
 * count and a cover (schemas/collection.ts, `CollectionSummary`). Newest
 * first. Empty is a real answer — nobody has a wishlist until they make one.
 */
export async function listCollections(
  kind: CollectionKind,
): Promise<CollectionSummaryList> {
  const raw = MODE === 'mock' ? await mocks.listCollections(kind) : live()
  return CollectionSummaryListSchema.parse(raw)
}

/**
 * `GET /collections/:collectionId` — one collection, whole: for a detail
 * screen. A wishlist comes back showing only what is still saved; see the
 * contract for why memberships are hidden rather than deleted.
 *
 * Asking for one that does not exist is a `not_found` — the screen says so.
 */
export async function getCollection(collectionId: string): Promise<Collection> {
  const raw = MODE === 'mock' ? await mocks.getCollection(collectionId) : live()
  return CollectionSchema.parse(raw)
}

/**
 * `GET /collections/:collectionId/suggestions` — experiences that would sit
 * well in this collection, as full experiences: the cards show a price.
 *
 * Empty means nothing to suggest, and the screen omits the section.
 */
export async function getCollectionSuggestions(
  collectionId: string,
): Promise<ExperienceList> {
  const raw =
    MODE === 'mock' ? await mocks.getCollectionSuggestions(collectionId) : live()
  return ExperienceListSchema.parse(raw)
}
