import * as mocks from '@/mocks/handlers'
import { ApiRequestError } from './schemas/error'
import {
  CollageItemsSchema,
  ExploreLayoutSchema,
  SectionItemsSchema,
  type CollageItems,
  type ExploreFilters,
  type ExploreLayout,
  type SectionItems,
} from './schemas/explore'

/**
 * The Explore endpoints, as typed functions TanStack Query calls.
 *
 * THIS IS THE BOUNDARY. It is the one place that knows whether it is
 * talking to a mock or a live provider, chosen by `VITE_API_MODE` — never by
 * an `if (isMock)` inside a component. Everything above this file sees the
 * same signatures either way.
 *
 * PARSE AT THE EDGE. Every response, mock or live, goes through its Zod
 * schema before it becomes application data. That validates the mocks too:
 * a fixture that cannot parse fails here, loudly, instead of hiding until
 * integration day.
 *
 * No React in this file, so it can be tested as plain functions.
 */

const MODE = (import.meta.env.VITE_API_MODE as string | undefined) ?? 'mock'

function live(): never {
  throw new ApiRequestError({
    code: 'unknown',
    message: 'No live API is configured yet.',
    retryable: false,
  })
}

export async function getExploreLayout(): Promise<ExploreLayout> {
  const raw = MODE === 'mock' ? await mocks.getExploreLayout() : live()
  return ExploreLayoutSchema.parse(raw)
}

export async function getExploreSection(
  id: string,
  filters: ExploreFilters,
): Promise<SectionItems> {
  const raw = MODE === 'mock' ? await mocks.getExploreSection(id, filters) : live()
  return SectionItemsSchema.parse(raw)
}

export async function getExploreCollage(id: string): Promise<CollageItems> {
  const raw = MODE === 'mock' ? await mocks.getExploreCollage(id) : live()
  return CollageItemsSchema.parse(raw)
}
