import { z } from 'zod'
import { EditorialSchema } from './editorial'
import { ExperienceSchema } from './experience'

/**
 * The Explore feed.
 *
 * Two calls, not one, because STATES ARE PER-SECTION. One rail timing out
 * while three answer is an operating condition, not an error
 * (api-contract.md, "Partial failure"). So:
 *
 *   getExploreLayout()          the ordered list of sections — cheap, static
 *   getExploreSection(id, ...)  one section's items — each its own request,
 *                               its own loading / error / empty state
 *
 * A screen that fetched everything in one call could only fail as a whole.
 */

/** How a rail's cards are drawn. Same component, different variant config. */
export const RailVariantSchema = z.enum(['portrait', 'compact', 'small'])
export type RailVariant = z.infer<typeof RailVariantSchema>

export const ExploreSectionSchema = z.discriminatedUnion('kind', [
  /** A horizontal rail of experiences, fetched separately. */
  z.object({
    kind: z.literal('rail'),
    id: z.string(),
    title: z.string(),
    variant: RailVariantSchema,
    /** Where the section heading links, if a destination exists yet. */
    href: z.string().optional(),
    /** A marker every card in this rail carries, e.g. "Elite". */
    badge: z.string().optional(),
  }),
  /**
   * "Ideas for Your Trip" — a collage drawn from the user's collections.
   * A brand-new user has no collections, so on cold start this section's
   * items come back empty and the section renders its empty state. That is
   * a designed state, not a failure.
   */
  z.object({
    kind: z.literal('collage'),
    id: z.string(),
    title: z.string(),
  }),
  /** A promo card. Inline content — nothing to fetch. */
  z.object({
    kind: z.literal('editorial'),
    id: z.string(),
    content: EditorialSchema,
  }),
])
export type ExploreSection = z.infer<typeof ExploreSectionSchema>

/**
 * `signal` says how much the app knows about this user. `none` is the cold
 * start: the layout leans on curation and carries no "because you liked X"
 * rails. Modelled now so the personalised layout is a data change later.
 */
export const ExploreLayoutSchema = z.object({
  signal: z.enum(['none', 'some']),
  sections: z.array(ExploreSectionSchema),
})
export type ExploreLayout = z.infer<typeof ExploreLayoutSchema>

/**
 * Filters that shape a section. Budget is a HARD filter on Explore
 * (user-flows.md §0); group size changes the maths, not what is shown.
 * Applied at the boundary — the API or the mock — never in a component.
 */
export const ExploreFiltersSchema = z.object({
  budget: z.object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
    currency: z.string().length(3),
  }),
  groupSize: z.number().int().positive(),
})
export type ExploreFilters = z.infer<typeof ExploreFiltersSchema>

/**
 * One section's items, plus which sources answered. Every list response
 * carries this so a missing vendor is disclosed rather than hidden.
 */
export const SectionItemsSchema = z.object({
  items: z.array(ExperienceSchema),
  sources: z.object({
    answered: z.array(z.string()),
    failed: z.array(z.string()),
  }),
})
export type SectionItems = z.infer<typeof SectionItemsSchema>

/** A collage's tiles are a subset of experience fields — id, title, image. */
export const CollageItemsSchema = z.object({
  caption: z.string().optional(),
  items: z.array(
    ExperienceSchema.pick({ experienceId: true, title: true, images: true }),
  ),
})
export type CollageItems = z.infer<typeof CollageItemsSchema>
