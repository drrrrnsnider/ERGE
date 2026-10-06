import { z } from 'zod'
import { ImageSchema } from './experience'

/**
 * `Collection` — Cart, Trip, Wishlist, List and Saved, as one shape.
 * docs/api-contract.md, `Collection`; docs/design-brief.md, "Cart, Trip,
 * Wishlist, List and Saved are one thing".
 *
 * They differ in metadata and in what you can do with them, not in what they
 * are: a list of experiences somebody gathered. So there is one schema, and
 * `kind` says which of the five this is. Saved is the first one built, and it
 * is the one with no metadata at all.
 *
 * Items carry ids, never copies of experiences — the same rule as recently
 * viewed. A stored copy goes stale the moment a price changes; an id is
 * resolved against the real data each time the list is drawn.
 */

export const CollectionKindSchema = z.enum([
  'cart',
  'trip',
  'wishlist',
  'list',
  'saved',
])
export type CollectionKind = z.infer<typeof CollectionKindSchema>

export const CollectionItemSchema = z.object({
  experienceId: z.string().min(1),
  /**
   * When it went in. [ASSUMPTION] Not in the contract's item shape, which
   * predates any list being drawn. A list is newest-first, and that needs
   * either this or trusting the server's array order — this survives a
   * server that sorts by something else. It is also what lets Undo put an
   * item back exactly where it was, rather than at the top.
   */
  addedAt: z.iso.datetime(),
  date: z.iso.date().optional(),
  time: z.string().optional(),
  /** Cart only — whether it is in the next checkout. Meaningless on Saved. */
  selected: z.boolean().default(false),
  giftedBy: z.string().optional(),
})
export type CollectionItem = z.infer<typeof CollectionItemSchema>

export const CollectionSchema = z.object({
  collectionId: z.string().min(1),
  kind: CollectionKindSchema,
  /** Supports [V2] multiple saved carts. See the contract. */
  active: z.boolean(),
  name: z.string().optional(),
  budget: z
    .object({
      min: z.number().int().nonnegative(),
      max: z.number().int().nonnegative(),
      currency: z.string().length(3),
    })
    .optional(),
  groupSize: z.number().int().positive().optional(),
  dates: z.object({ start: z.iso.date(), end: z.iso.date() }).optional(),
  items: z.array(CollectionItemSchema),
})
export type Collection = z.infer<typeof CollectionSchema>

/**
 * One collection as a grid card draws it — `Card / List MD`: a name, how
 * many experiences it holds, and a cover.
 *
 * [ASSUMPTION] Not in the contract, which only has the full `Collection`.
 * A grid of six wishlists should not have to load every experience in all
 * six to find a picture and a count; the server already knows both. The
 * full `Collection` is for the detail screen.
 *
 * `cover` is optional: an empty wishlist has nothing to show, and the card
 * draws its empty image surface instead.
 */
export const CollectionSummarySchema = z.object({
  collectionId: z.string().min(1),
  kind: CollectionKindSchema,
  name: z.string().min(1),
  itemCount: z.number().int().nonnegative(),
  cover: ImageSchema.optional(),
})
export type CollectionSummary = z.infer<typeof CollectionSummarySchema>

export const CollectionSummaryListSchema = z.object({
  items: z.array(CollectionSummarySchema),
})
export type CollectionSummaryList = z.infer<typeof CollectionSummaryListSchema>
