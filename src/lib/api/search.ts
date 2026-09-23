import * as mocks from '@/mocks/handlers'
import { ApiRequestError } from './schemas/error'
import {
  SearchResultsSchema,
  type SearchFilters,
  type SearchResults,
} from './schemas/search'

/**
 * The search endpoint, as a typed function TanStack Query calls.
 *
 * Same boundary rules as explore.ts — mock or live chosen by VITE_API_MODE,
 * the response parsed at the edge, no React in the file. A STUB in the sense
 * that the shape is ours rather than negotiated; see schemas/search.ts.
 */

const MODE = (import.meta.env.VITE_API_MODE as string | undefined) ?? 'mock'

function live(): never {
  throw new ApiRequestError({
    code: 'unknown',
    message: 'No live API is configured yet.',
    retryable: false,
  })
}

export async function getSearchResults(
  filters: SearchFilters,
): Promise<SearchResults> {
  const raw = MODE === 'mock' ? await mocks.getSearchResults(filters) : live()
  return SearchResultsSchema.parse(raw)
}
