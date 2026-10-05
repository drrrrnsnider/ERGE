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
  label,
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
  /**
   * The link's accessible name when there is no `name` to carry it.
   *
   * With a name, the name is the link and the band is a picture beside it.
   * Without one — the detail screen's pairings are just the band — the band
   * itself has to be the link, and a band of photos has no words of its own:
   * left alone, a screen reader would read out four alt texts in a row and
   * never say what tapping does. So the caller says it.
   */
  label?: string
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
      {to !== undefined && name === undefined ? (
        /* `block rounded-lg` so the focus outline follows the band's
         * corners rather than drawing a square round them. */
        <Link to={to} aria-label={label} className="block rounded-lg">
          {band}
        </Link>
      ) : (
        band
      )}

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
