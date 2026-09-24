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
 * STILL A SECOND VOCABULARY, and worth knowing about. `ExperienceCategory`
 * says what an experience IS; this says what the design offers to filter BY.
 * Every entry here now has a home, but the two lists are not the same list
 * and are not guaranteed to stay parallel — `event`, `transport` and
 * `lodging` have no tab, deliberately, because a rideshare is not something
 * you browse for on this screen.
 *
 *     Dining -> dining    Drinks -> drinks    Gifts  -> gift
 *     Tours  -> tour      Sports -> sports    Spa    -> wellness
 *
 * Drinks and Sports used to map to nothing. Rather than folding them into
 * `dining` and `event` to make the row work, the enum grew — the API
 * contract describes that field as open-ended, so it was not a breaking
 * change, and collapsing them would have looked right until a bar and a
 * restaurant had to be told apart.
 *
 * The mapping lives in exactly one place, in the mock, and moves to the
 * backend with it.
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
 * Duration as BANDS, not a number of minutes.
 *
 * Nobody filters for "between 73 and 145 minutes" — they filter for "an
 * evening" or "a quick one", and a band is what a chip can say in two words.
 * The backend is free to hold real minutes; this is the vocabulary the UI
 * asks in.
 *
 * `Experience` has no structured duration today — it is a label/value pair in
 * `details`, as free text like "90 min" or "3–4 hours". The mock parses that,
 * which is a mock's job; a real API would send minutes and this would become
 * a range comparison. Flagged so nobody mistakes the parser for a contract.
 */
export const DurationBandSchema = z.enum([
  'any',
  'under-1h',
  '1-2h',
  '2-4h',
  '4h-plus',
])
export type DurationBand = z.infer<typeof DurationBandSchema>

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
  /** The chip row's own filters. `any` is off. */
  duration: DurationBandSchema,
  /** "Right Now" — only what can actually be booked. */
  availableNow: z.boolean(),
})
export type SearchFilters = z.infer<typeof SearchFiltersSchema>

/**
 * Reads the `?near=` param into `filters.location`.
 *
 * `me` is a token, not a place name, and both search screens arrive with it:
 * Explore's location button links straight to the results with it set, and
 * the takeover can be opened the same way. Without this the results bar
 * cheerfully rendered a chip reading "me".
 *
 * Absent also means here — the design opens with the location applied — so
 * only an explicit empty value means "no location at all".
 */
export function locationFromNear(near: string | null): string | null {
  if (near === null || near === 'me') return 'Current Location'
  if (near.trim() === '') return null
  return near
}

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
