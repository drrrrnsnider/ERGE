import * as mocks from '@/mocks/handlers'
import { ApiRequestError } from './schemas/error'
import {
  ExperienceListSchema,
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
