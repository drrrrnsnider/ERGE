import { Link } from 'react-router'
import type { Image } from '@/lib/api/schemas/experience'
import { cn } from '@/lib/utils'

/**
 * `Card / Trip LG` (Figma 180:7417) — a COLLECTION of experiences, not one.
 *
 * The same width and height as `Card / Media LG` and a different object
 * underneath, which is why it is not a variant of ExperienceCard. That card
 * shows one experience: a hero, three supporting shots, and a price. This
 * shows four experiences as four equal columns, and where the price would be
 * it says how many things are in the collection.
 *
 * FOUR EQUAL COLUMNS, NOT A GRID. The band is a fixed 180 tall whatever the
 * pictures are, so a trip of four portraits and a trip of four landscapes are
 * the same shape on the page. A grid would let the content decide the height
 * and every card in a list would be a different size.
 *
 * It was inline in Explore's collage section first. The detail screen's
 * "Complete the Experience" needed the same band, so it moved here rather
 * than being written twice.
 *
 * THE TEXT BLOCK IS OPTIONAL, and Explore currently passes almost none of
 * it. That is not a styling choice — `CollageItems` carries a caption and
 * nothing else, so there is no name and no count to show, while the design's
 * component has all three. Either that response grows the two fields or the
 * Explore section is genuinely a different, quieter thing than a trip card.
 * Flagged rather than resolved by inventing a name here.
 */
export function TripCard({
  images,
  name,
  meta,
  experienceCount,
  to,
  className,
}: {
  /**
   * Up to four are shown; fewer simply share the width.
   *
   * Entries may be `undefined`, and that is not laziness in the type: an
   * experience with no photo is a real case the fixtures deliberately
   * include, and it should still HOLD ITS COLUMN rather than vanish. The
   * band is meant to say "four things"; dropping one would quietly widen
   * the rest and misrepresent the collection.
   */
  images: readonly (Image | undefined)[]
  name?: string
  meta?: string
  experienceCount?: number
  /** Where the collection opens, when there is somewhere to go. */
  to?: string
  className?: string
}) {
  const band = (
    /* `stroke-gradient` and the overflow clip belong to the band, not the
     * card, so the text beneath sits outside the frame exactly as it does on
     * the experience cards. */
    <ul className="flex h-45 gap-1 overflow-hidden rounded-lg stroke-gradient">
      {images.slice(0, 4).map((image, index) => (
        <li
          key={image ? `${image.url}-${index}` : `empty-${index}`}
          className="min-w-0 flex-1 bg-muted"
        >
          {image ? (
            <img
              src={image.url}
              alt={image.alt}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : null}
        </li>
      ))}
    </ul>
  )

  return (
    <article
      data-slot="trip-card"
      className={cn('flex w-full flex-col gap-2', className)}
    >
      {band}

      {name === undefined && meta === undefined && experienceCount === undefined ? null : (
        <div className="flex flex-col gap-1 px-2">
          {name === undefined ? null : to === undefined ? (
            <p className="text-h3 font-medium text-foreground">{name}</p>
          ) : (
            <Link to={to} className="text-h3 font-medium text-foreground">
              {name}
            </Link>
          )}
          {meta === undefined ? null : (
            <p className="text-body-md text-muted-foreground">{meta}</p>
          )}
          {experienceCount === undefined ? null : (
            /* The count sits where a price sits on an experience card, and
             * reads as the same kind of fact: what this costs you, versus
             * how much of it there is. */
            <p className="text-h4 font-medium text-emphasis">
              {experienceCount} {experienceCount === 1 ? 'Experience' : 'Experiences'}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
