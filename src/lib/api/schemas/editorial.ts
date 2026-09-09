import { z } from 'zod'

/**
 * Editorial content — the two promo cards on Explore.
 *
 * These are deliberately NOT `Experience`s. Neither carries a price, an
 * availability, a location, a vendor or an access tier, and one of them
 * ("Earn equity with every experience you book") is not bookable at all.
 * Forcing them into `Experience` would mean a bookable object with none of
 * the fields that make it bookable, and a branch everywhere Experience
 * renders.
 *
 * [ASSUMPTION] There is no shape for this in docs/api-contract.md, and
 * design-brief.md puts CMS-dependent editorial content out of v1 pending D9.
 * This is a client-side contract so the feed can be uniformly data-driven
 * now; expect it to be replaced or deleted when D9 resolves. It is small on
 * purpose.
 */

const HrefSchema = z.string().min(1)

/** "ERGE Guides" — a headline over a row of category entry points. */
const GuidesSchema = z.object({
  kind: z.literal('guides'),
  id: z.string(),
  badge: z.string(),
  headline: z.string(),
  entries: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      href: HrefSchema,
      /**
       * A tile may carry a background photo behind its label — one of the
       * four in the design does. [ASSUMPTION] no contract field for it.
       */
      image: z
        .object({ url: z.string(), alt: z.string() })
        .optional(),
    }),
  ),
})

/** "Promotion" — a headline, a caption, and exactly one call to action. */
const PromotionSchema = z.object({
  kind: z.literal('promotion'),
  id: z.string(),
  badge: z.string(),
  headline: z.string(),
  caption: z.string(),
  cta: z.object({
    label: z.string(),
    href: HrefSchema,
  }),
})

export const EditorialSchema = z.discriminatedUnion('kind', [
  GuidesSchema,
  PromotionSchema,
])
export type Editorial = z.infer<typeof EditorialSchema>
