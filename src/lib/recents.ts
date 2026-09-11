import { z } from 'zod'
import { readJSON, writeJSON } from './storage'

/**
 * What this device has searched for and looked at lately.
 *
 * Local, not server state — it is about this device, it has to work with no
 * network, and it is nobody else's business. So it goes through
 * `lib/storage.ts` rather than `lib/api/`, and TanStack Query is not
 * involved. That is the one exception to "components go through lib/api",
 * and it is the reason this file sits beside it rather than inside it.
 *
 * Recently VIEWED stores ids, not copies of experiences. A stored copy goes
 * stale the moment a price or a title changes, and would then be a second
 * source of truth for the same object — the thing the API layer exists to
 * prevent. Ids get resolved against the real data when the list is drawn, so
 * a card can never show a price that is no longer true.
 *
 * Both lists are most-recent-first, de-duplicated, and capped. The caps are
 * the design's: six searches is the two rows of chips the takeover draws,
 * and ten viewed is a little over the nine cards it shows.
 */

/* Versioned keys. If the stored shape ever changes, bump the suffix and the
 * old value is simply never read again — no migration code, no half-parsed
 * state. The old key is left behind, which costs a few bytes once. */
const SEARCHES_KEY = 'erge.recent-searches.v1'
const VIEWED_KEY = 'erge.recently-viewed.v1'

const MAX_SEARCHES = 6
const MAX_VIEWED = 10

/* Bounded at the schema too, not just on write. The stored value could have
 * been written by a different version, or edited by hand — this is the same
 * "parse at the edge" rule the API layer follows. */
const SearchesSchema = z.array(z.string().min(1).max(200)).max(50)
const ViewedSchema = z.array(z.string().min(1).max(200)).max(50)

/** Most-recent-first, `value` moved to the front if it was already there. */
function promote(list: string[], value: string, cap: number): string[] {
  return [value, ...list.filter((item) => item !== value)].slice(0, cap)
}

export async function getRecentSearches(): Promise<string[]> {
  const stored = await readJSON(SEARCHES_KEY, SearchesSchema)
  return (stored ?? []).slice(0, MAX_SEARCHES)
}

/**
 * Records a search and returns the new list, so a caller can update state
 * without a second read.
 *
 * Trims, and ignores an empty query — pressing enter on a blank field is not
 * a search and should not push a real one off the end of the list.
 */
export async function addRecentSearch(query: string): Promise<string[]> {
  const trimmed = query.trim()
  if (trimmed === '') return getRecentSearches()

  const next = promote(await getRecentSearches(), trimmed, MAX_SEARCHES)
  await writeJSON(SEARCHES_KEY, next)
  return next
}

export async function getRecentlyViewed(): Promise<string[]> {
  const stored = await readJSON(VIEWED_KEY, ViewedSchema)
  return (stored ?? []).slice(0, MAX_VIEWED)
}

export async function addRecentlyViewed(experienceId: string): Promise<string[]> {
  const trimmed = experienceId.trim()
  if (trimmed === '') return getRecentlyViewed()

  const next = promote(await getRecentlyViewed(), trimmed, MAX_VIEWED)
  await writeJSON(VIEWED_KEY, next)
  return next
}
