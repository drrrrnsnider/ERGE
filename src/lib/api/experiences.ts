import * as mocks from '@/mocks/handlers'
import { ApiRequestError } from './schemas/error'
import {
  ExperienceBandSchema,
  ExperienceListSchema,
  ExperienceSchema,
  type Experience,
  type ExperienceBand,
  type ExperienceList,
} from './schemas/experience'

/**
 * Looking up experiences you already have the ids of.
 *
 * Recently viewed is the first caller: lib/recents stores ids, deliberately,
 * so that a card can never show a price that stopped being true while it sat
 * in storage. This is what turns those ids back into experiences.
 *
 * Same boundary rules as explore.ts — mock or live chosen by VITE_API_MODE,
 * every response parsed at the edge, no React in the file.
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
 * Resolves ids to experiences, in the order asked for.
 *
 * Ids that no longer exist are simply absent from the result, so the caller
 * has to treat the list as "these are the ones that are still there" rather
 * than assuming it lines up with what it sent.
 */
export async function getExperiencesByIds(
  ids: readonly string[],
): Promise<ExperienceList> {
  // Nothing to ask for. Skip the round trip rather than sending an empty query.
  if (ids.length === 0) return { items: [] }

  const raw = MODE === 'mock' ? await mocks.getExperiencesByIds(ids) : live()
  return ExperienceListSchema.parse(raw)
}

/**
 * One experience, for the detail screen.
 *
 * Its own call rather than `getExperiencesByIds([id])`, because the two
 * answer different questions. A list lookup treats a missing id as an
 * ordinary outcome and simply returns fewer rows; asking for ONE thing and
 * not finding it is a `not_found`, and the screen has to say so rather than
 * rendering an empty page. Collapsing them would mean every caller checking
 * `items[0]` and inventing its own error.
 */
export async function getExperience(id: string): Promise<Experience> {
  const raw = MODE === 'mock' ? await mocks.getExperience(id) : live()
  return ExperienceSchema.parse(raw)
}

/**
 * What goes with this experience — the detail screen's "Complete the
 * Experience" band. Suggested around one anchor, the brief's anchor pattern:
 * dinner here, then cocktails nearby, then a ride home.
 *
 * THE ANCHOR IS NOT IN THE RESULT. These are its companions only; the screen
 * puts the anchor first itself, since it already has it. Asking the server
 * to include it would mean trusting it to put it first, every time, and the
 * band reading wrong whenever it did not.
 *
 * Empty is an answer — nothing pairs well yet — and the screen leaves the
 * section out rather than showing an empty state for it.
 */
export async function getPairings(id: string): Promise<ExperienceBand> {
  const raw = MODE === 'mock' ? await mocks.getPairings(id) : live()
  return ExperienceBandSchema.parse(raw)
}
