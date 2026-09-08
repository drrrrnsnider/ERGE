import { describe, expect, it } from 'vitest'
import { ExperienceSchema } from '@/lib/api/schemas/experience'
import { experiences } from './experiences'

/**
 * Every fixture is parsed through the real schema.
 *
 * A mock that cannot parse is a mock that is lying to you, and it hides a bug
 * until integration day (src/mocks/README.md). This is the test that makes
 * that rule real rather than aspirational.
 *
 * The second block asserts the data is actually AWKWARD — the other rule of
 * that folder. Tidy mock data produces layouts that only work on tidy data,
 * so if someone quietly replaces these fixtures with a clean set, the
 * layouts stop being exercised and these tests say so.
 */
describe('experience fixtures', () => {
  it.each(experiences.map((e) => [e.experienceId, e] as const))(
    '%s parses against ExperienceSchema',
    (_id, experience) => {
      expect(() => ExperienceSchema.parse(experience)).not.toThrow()
    },
  )

  it('has unique ids', () => {
    const ids = experiences.map((e) => e.experienceId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('fixtures stay awkward on purpose', () => {
  it('includes an experience with no image', () => {
    expect(experiences.some((e) => e.images.length === 0)).toBe(true)
  })

  it('includes a title long enough to wrap and truncate', () => {
    expect(experiences.some((e) => e.title.length > 50)).toBe(true)
  })

  it('includes both price presentations', () => {
    expect(experiences.some((e) => e.price.kind === 'final')).toBe(true)
    expect(experiences.some((e) => e.price.kind === 'from')).toBe(true)
  })

  it('includes every availability status', () => {
    for (const status of ['available', 'unavailable', 'unknown'] as const) {
      expect(experiences.some((e) => e.availability.status === status)).toBe(
        true,
      )
    }
  })

  it('includes a deeplink-tier vendor, which cannot be booked in app', () => {
    expect(experiences.some((e) => e.accessTier === 'deeplink')).toBe(true)
  })
})
