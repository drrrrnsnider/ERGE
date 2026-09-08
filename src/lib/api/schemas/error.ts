import { z } from 'zod'

/**
 * The one error shape screens ever see — docs/api-contract.md, "Errors".
 *
 * Every provider failure is normalised into this server-side. `code` is a
 * closed set the client can branch on; `message` is written by us and safe to
 * show. Screens never special-case per vendor: if a component needs to know
 * which vendor failed, the normalisation layer has failed, not the component.
 */
export const ApiErrorCodeSchema = z.enum([
  'network',
  'timeout',
  'not_found',
  'vendor_unavailable',
  'validation',
  'unknown',
])

export const ApiErrorSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
  vendorId: z.string().optional(),
  field: z.string().optional(),
})

export type ApiError = z.infer<typeof ApiErrorSchema>

/**
 * Thrown by the API layer so TanStack Query's `error` carries the normalised
 * shape rather than a bare string. A plain class with an explicit field, not
 * a parameter property — `erasableSyntaxOnly` forbids the latter.
 */
export class ApiRequestError extends Error {
  detail: ApiError

  constructor(detail: ApiError) {
    super(detail.message)
    this.name = 'ApiRequestError'
    this.detail = detail
  }
}

/**
 * Anything can be thrown. This turns whatever TanStack Query hands back into
 * the shape ErrorState renders, so components never inspect `unknown`.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiRequestError) return error.detail
  return {
    code: 'unknown',
    message: 'Something went wrong loading this.',
    retryable: true,
  }
}
