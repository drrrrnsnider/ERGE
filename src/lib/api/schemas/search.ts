import { z } from 'zod'
import { ExperienceSchema } from './experience'

/**
 * Search — the shapes the results screen is built against.
 *
 * A STUB, deliberately. The screen is being built first and the backend
 * joins later, so this is the smallest contract that lets the UI be real:
 * enough to type the call, parse the answer and swap in a live endpoint
 * without touching a component. It is not a negotiated API — when the
 * backend team arrives, expect the filter names to move.
 *
 * What is NOT guessed at here: ranking, pagination cursors, faceted counts,
 * "did you mean", and saved searches. Each of those changes the shape of the
 * response, and inventing them now would mean writing a contract nobody
 * agreed to and then building a screen that depends on it.
 */

/**
 * The category row across the top of the results sheet.
 *
 * A SECOND VOCABULARY, and that needs flagging rather than hiding.
 * `ExperienceCategory` already exists — dining, event, tour, wellness,
 * transport, gift, lodging, other — and it is what an experience IS. This is
 * what the design offers to filter BY, and the two do not line up:
 *
 *     Dining  -> dining          Tours  -> tour
 *     Gifts   -> gift            Spa    -> wellness
 *     Drinks  -> NOTHING         Sports -> NOTHING
 *
 * Drinks and Sports have no home in the data model. Collapsing them onto
 * `event` or `dining` to make the row work would be the same mistake the
 * status tokens exist to prevent: it looks right until a bar and a
 * restaurant need to be told apart, and then it is a migration.
 *
 * So the row keeps its own names and the mapping lives in one place, in the
 * mock. The unblock is a product decision — either `ExperienceCategory`
 * grows the two, or the row loses them.
 */
export const SearchCategorySchema = z.enum([
  'all',
  'dining',
  'drinks',
  'gifts',
  'tours',
  'sports',
  'spa',
])
export type SearchCategory = z.infer<typeof SearchCategorySchema>

/**
 * What the takeover collects, as the results screen receives it.
 *
 * Dates are ISO calendar days (`2026-09-15`), not timestamps — a booking
 * window is a day, and putting a time and a zone on it invites the
 * off-by-one where a trip starting "the 15th" is stored as the 14th
 * somewhere west of UTC.
 */
export const SearchFiltersSchema = z.object({
  query: z.string(),
  /** `null` once someone clears the location, which is a real state. */
  location: z.string().nullable(),
  dates: z
    .object({
      from: z.string(),
      to: z.string().nullable(),
    })
    .nullable(),
  budget: z.object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
    currency: z.string().length(3),
  }),
  category: SearchCategorySchema,
})
export type SearchFilters = z.infer<typeof SearchFiltersSchema>

/**
 * `sources` for the same reason every list response carries it: several
 * vendors answer a search and one of them failing is an operating condition,
 * not an error. The screen renders what arrived.
 *
 * `ceiling` is the highest price in the unfiltered result set, in minor
 * units. It is what the budget slider's track should end at, so the range
 * spans what is actually buyable rather than a number picked in advance.
 */
export const SearchResultsSchema = z.object({
  items: z.array(ExperienceSchema),
  ceiling: z.number().int().nonnegative(),
  sources: z.object({
    answered: z.array(z.string()),
    failed: z.array(z.string()),
  }),
})
export type SearchResults = z.infer<typeof SearchResultsSchema>
