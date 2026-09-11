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

/**
 * What the amount buys — the design writes "from $45 / couple", "from $89 /
 * person", "from $45 / bouquet".
 *
 * [ASSUMPTION] docs/api-contract.md has no field for this; `price` is
 * kind/amount/currency only. It cannot be derived from `category` — a
 * restaurant is priced per person and a picnic per couple, both `dining` —
 * so it has to travel with the price. Optional, because plenty of things are
 * priced flat and the qualifier would be noise.
 */
export const PriceUnitSchema = z.string().min(1).optional()
export const PriceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('final'),
    total: z.number().int().nonnegative(),
    currency: z.string().length(3),
    taxesIncluded: z.literal(true),
    unit: PriceUnitSchema,
  }),
  z.object({
    kind: z.literal('from'),
    base: z.number().int().nonnegative(),
    currency: z.string().length(3),
    taxesIncluded: z.literal(false),
    unit: PriceUnitSchema,
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

  /**
   * The short descriptor the large card shows above its duration — "City
   * views & candlelight". [ASSUMPTION] Not in docs/api-contract.md.
   *
   * It exists because the two card sizes show DIFFERENT metadata: the large
   * card reads `summary • duration`, the compact one `address • duration`.
   * That is a real difference in the design, not a rendering choice, so the
   * summary is its own field rather than a `details[]` entry the component
   * has to go looking for by label.
   */
  summary: z.string().optional(),

  /**
   * The "Elite" marker — a badge plus a copper stroke on the card.
   *
   * [ASSUMPTION] Nothing in docs/api-contract.md covers it. Deliberately NOT
   * `accessTier`, which is about whether we can book the thing (full /
   * authenticated / deeplink); this is a curation or quality tier and the two
   * are independent. Modelled on the experience rather than the section
   * because an Elite experience stays Elite wherever it is rendered.
   */
  elite: z.boolean().optional(),
})
export type Experience = z.infer<typeof ExperienceSchema>

/**
 * A plain list of experiences, for looking up ones you already know the id
 * of — recently viewed, a saved list, a cart.
 *
 * No `sources` block, unlike SectionItems. That exists so a section can
 * disclose which vendors failed to answer a SEARCH; a lookup by id either
 * finds the thing or does not, and there is no partial answer to disclose.
 *
 * The list may be SHORTER than the ids asked for, and callers must cope: an
 * experience can be delisted between being viewed and being asked for again.
 * Order follows the request, so a caller's own ordering survives.
 */
export const ExperienceListSchema = z.object({
  items: z.array(ExperienceSchema),
})
export type ExperienceList = z.infer<typeof ExperienceListSchema>
