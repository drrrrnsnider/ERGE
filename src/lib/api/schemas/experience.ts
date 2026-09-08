import { z } from 'zod'

/**
 * `Experience` — the polymorphic core of the whole app. docs/api-contract.md.
 *
 * The same object renders in Explore, search results, the map, the PDP, a
 * cart card, a list row and a chat package. Every provider is normalised into
 * this shape server-side, so the client never sees a vendor-shaped response.
 */

/** Minor units as an integer plus ISO 4217. Never floats. $45.00 is 4500. */
export const MoneySchema = z.object({
  amount: z.number().int().nonnegative(),
  currency: z.string().length(3),
})
export type Money = z.infer<typeof MoneySchema>

/**
 * Two presentations, and the client MUST tell them apart.
 *
 *   final  — all-in, taxes included, trustworthy at checkout
 *   from   — a base rate EXCLUDING fees. Copy says "from $45 + fees", never
 *            an implied all-in figure. Participates in budget filtering at
 *            its low bound (decided — see api-contract.md, `price`).
 *
 * Discriminated on `kind` so a component cannot read `total` off a `from`
 * price by accident: TypeScript narrows, and the wrong field does not exist.
 */
export const PriceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('final'),
    total: z.number().int().nonnegative(),
    currency: z.string().length(3),
    taxesIncluded: z.literal(true),
  }),
  z.object({
    kind: z.literal('from'),
    base: z.number().int().nonnegative(),
    currency: z.string().length(3),
    taxesIncluded: z.literal(false),
  }),
])
export type Price = z.infer<typeof PriceSchema>

/** The figure budget filtering compares against. `from` items use their base. */
export function priceLowBound(price: Price): Money {
  return price.kind === 'final'
    ? { amount: price.total, currency: price.currency }
    : { amount: price.base, currency: price.currency }
}

/**
 * `unknown` is legitimate and common — availability usually cannot be
 * determined without a date. Render it as "select a date to check", never as
 * an error.
 */
export const AvailabilitySchema = z.object({
  status: z.enum(['available', 'unavailable', 'unknown']),
  slots: z.array(z.iso.datetime({ offset: true })).optional(),
})
export type Availability = z.infer<typeof AvailabilitySchema>

/**
 * Experiences carry their venue's timezone. "7:30pm" means 7:30pm where the
 * restaurant is; the client must not silently convert to device time.
 */
export const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string(),
  timezone: z.string(),
})
export type Location = z.infer<typeof LocationSchema>

/**
 * Vendor access tiers (D1). The client must handle all three without a
 * redesign — a vendor moving between tiers is a config change.
 */
export const AccessTierSchema = z.enum(['full', 'authenticated', 'deeplink'])
export type AccessTier = z.infer<typeof AccessTierSchema>

/**
 * The contract lists this as open-ended ("dining | event | tour | ..."). This
 * is the set the Explore frame actually uses plus `other` as the escape
 * hatch. [ASSUMPTION] `lodging` — the "Unique Lodging" rail — is not in the
 * contract's example list.
 */
export const ExperienceCategorySchema = z.enum([
  'dining',
  'event',
  'tour',
  'wellness',
  'transport',
  'gift',
  'lodging',
  'other',
])
export type ExperienceCategory = z.infer<typeof ExperienceCategorySchema>

/**
 * `details[]` absorbs type-specific fields — party size, duration, seat
 * class — as label/value pairs, so the component stays stable as categories
 * are added. Anything needing its own interaction is a separate component
 * slotted in, not a change to this shape.
 */
export const DetailSchema = z.object({
  label: z.string(),
  value: z.string(),
})
export type Detail = z.infer<typeof DetailSchema>

/**
 * [ASSUMPTION] The contract says `images[]` "from the vendor" and nothing
 * more. Alt text is required for accessibility, so it is modelled here and
 * the normalisation layer is expected to supply it. An empty array is legal —
 * a restaurant with no photo is a real case, and the card must cope.
 */
export const ImageSchema = z.object({
  url: z.string(),
  alt: z.string(),
})
export type Image = z.infer<typeof ImageSchema>

export const ExperienceSchema = z.object({
  /** Durable primary key. */
  experienceId: z.string(),
  /** Google Place ID where applicable — a tour is not a place. */
  placeId: z.string().optional(),
  title: z.string(),
  category: ExperienceCategorySchema,
  vendorId: z.string(),
  accessTier: AccessTierSchema,
  location: LocationSchema,
  images: z.array(ImageSchema),
  price: PriceSchema,
  availability: AvailabilitySchema,
  details: z.array(DetailSchema),
})
export type Experience = z.infer<typeof ExperienceSchema>
