import { SaveButton } from '@/components/app/save-button'
import { Elite as EliteIcon } from '@/components/icons'
import { Link } from 'react-router'
import { addRecentlyViewed } from '@/lib/recents'
import { priceLowBound, type Experience } from '@/lib/api/schemas/experience'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * The experience card, in the four shapes the design library defines.
 *
 * These are four separate components in Figma — `Card / Media MD`,
 * `Card / Media SM`, `Card / Media SM Narrow` and `Card / Media XS` — and the
 * variant names here match them exactly, so a conversation about "media-sm"
 * means the same thing in both places. They are one component in code because
 * they render the same data through the same text block and differ only in
 * arrangement; splitting them would be four files that must be changed
 * together every time the contract moves.
 *
 * They are NOT interchangeable, and each is used where the design uses it:
 *
 *   media-md         320x180 hero + a rail of three thumbnails. Carries the
 *                    Elite treatment and a chrome-backed save button.
 *   media-sm         320-wide horizontal row, 110x80 thumbnail, bare save
 *                    icon with no button chrome.
 *   media-sm-narrow  152-wide column, 110-tall image, NO save button.
 *   media-xs         66x48 thumbnail beside two lines. No save button and NO
 *                    PRICE — it is a pointer back to something you already
 *                    looked at, in the search takeover's "Recently viewed",
 *                    not an offer.
 *
 * The card is one link with the save button layered on top — not a link
 * wrapping a button, which is invalid and unusable by keyboard. The link's
 * accessible name carries the title, so the save button only has to name
 * itself and the thing it acts on.
 */

type Variant = 'media-md' | 'media-sm' | 'media-sm-narrow' | 'media-xs'

/** Where a card goes. The PDP is not built; the route reports what it got. */
const hrefFor = (experience: Experience) =>
  `/experience/${experience.experienceId}`

/**
 * The card's link, which also records that you looked at the thing.
 *
 * This is what fills "Recently viewed" in the search takeover, and it is
 * recorded HERE rather than on the detail screen on purpose: the detail
 * screen does not exist yet, and when it does, arriving by a shared URL is
 * not the same as choosing something out of a list. Opening a card is the
 * event worth remembering either way.
 *
 * It stores an id, never a copy — lib/recents explains why. The write is
 * fire-and-forget: nothing about navigating should wait on storage, and a
 * device that refuses to remember should still let you through.
 */
function OpenLink({
  experience,
  className,
  children,
}: {
  experience: Experience
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={hrefFor(experience)}
      onClick={() => void addRecentlyViewed(experience.experienceId)}
      className={className}
    >
      {children}
    </Link>
  )
}

/**
 * "from $45 / couple" vs "$100 / person".
 *
 * The two presentations still have to be distinguishable — an estimate that
 * is not marked and then grows at checkout undermines the whole budget
 * position (interaction-spec.md) — but the marker is the word "from", which
 * is what the design uses. An extra "+ fees" was in an earlier build and is
 * gone: it made the line read "from $45 / couple + fees", and doubling the
 * hedge made it harder to scan without making it more honest.
 */
function Price({ experience }: { experience: Experience }) {
  const { price } = experience
  const amount = formatMoney(priceLowBound(price))

  /* One colour for the whole line — Text/Secondary, inherited from the <p>
   * that wraps this. "from" and "/ couple" used to be Text/Muted, which
   * split a five-word line across two greys and made the amount look like a
   * separate element sitting inside a caption. They are one phrase and now
   * read as one. */
  return (
    <>
      {price.kind === 'from' ? 'from ' : null}
      {amount}
      {price.unit ? ` / ${price.unit}` : null}
    </>
  )
}

/**
 * `Badge Icon/Elite` — 32px pill, icon plus label, on the hero image.
 *
 * Its stroke is the same Elite gradient as the card's, so the badge and the
 * frame around it are visibly one treatment. Note there is no `relative`
 * here: the badge is already `absolute`, which is the containing block the
 * gradient's ::after needs, and `stroke-gradient-elite` deliberately does not
 * set position for exactly this reason.
 */
function EliteBadge() {
  return (
    <p className="absolute top-2 left-2 z-10 flex h-8 items-center gap-1 rounded-full stroke-gradient-elite bg-card/90 pr-3 pl-2 text-body-md text-emphasis shadow-lift">
      <EliteIcon className="size-5" />
      Elite
    </p>
  )
}

/** A picture, or the surface that stands in for one. */
function Media({
  experience,
  index = 0,
  className,
}: {
  experience: Experience
  index?: number
  className?: string
}) {
  const image = experience.images[index]
  return (
    <div className={cn('overflow-hidden bg-muted', className)}>
      {image ? (
        <img
          src={image.url}
          alt={image.alt}
          loading="lazy"
          className="size-full object-cover"
        />
      ) : null}
    </div>
  )
}

export function ExperienceCard({
  experience,
  variant,
  saved = false,
  onToggleSave,
}: {
  experience: Experience
  variant: Variant
  /**
   * Only `media-md` and `media-sm` draw a save button — the other two have
   * none by design, which is why these are optional rather than something
   * every call site has to invent a value for. A list that cannot save
   * anything should not have to pass a boolean and a no-op to say so.
   */
  saved?: boolean
  onToggleSave?: (experienceId: string) => void
}) {
  const duration = experience.details.find((d) => d.label === 'Duration')?.value

  /* The two sizes deliberately show different metadata — the large card
   * leads with the descriptor, the compact one with where it is. */
  const meta =
    variant === 'media-md'
      ? [experience.summary, duration]
      : [experience.location.address, duration]
  const metaLine = meta.filter(Boolean).join('  •  ')

  if (variant === 'media-md') {
    return (
      <article
        data-slot="experience-card"
        data-variant={variant}
        className="relative flex w-80 flex-col gap-2"
      >
        <div
          className={cn(
            'relative flex h-45 gap-1 overflow-hidden rounded-lg',
            /* Elite swaps the media stroke for its own gradient — full
             * Border/Focus at the top easing to the same translucent copper
             * an ordinary card gets at the bottom. That swap is the whole
             * point of the treatment, and landing on the house hairline
             * rather than on nothing is what keeps it a promotion of the
             * normal card instead of a different object. */
            experience.elite
              ? 'stroke-gradient-elite'
              : 'stroke-gradient',
          )}
        >
          {/* Hero, then a vertical rail of three thumbnails beside it. */}
          <Media
            experience={experience}
            index={0}
            className="h-full w-57.5 shrink-0"
          />
          {experience.elite ? <EliteBadge /> : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {[1, 2, 3].map((i) => (
              <Media
                key={i}
                experience={experience}
                index={i}
                className="min-h-0 flex-1"
              />
            ))}
          </div>
          <SaveButton
            saved={saved}
            label={experience.title}
            onToggle={() => onToggleSave?.(experience.experienceId)}
            style="Button"
            className="absolute top-2 right-2 z-10"
          />
        </div>
        <div className="flex flex-col gap-1 px-2">
          <OpenLink experience={experience} className="text-h3 font-medium text-foreground">
            {experience.title}
          </OpenLink>
          <p className="text-body-md text-muted-foreground">{metaLine}</p>
          <p className="text-h4 font-medium text-emphasis">
            <Price experience={experience} />
          </p>
        </div>
      </article>
    )
  }

  if (variant === 'media-sm') {
    return (
      <article
        data-slot="experience-card"
        data-variant={variant}
        /* `isolate` so the two strokes below can be ordered against each
         * other and nothing else. Without a stacking context here they would
         * be competing up in `main`, which is where the last z-index bug
         * came from. */
        className="relative isolate flex w-80 items-center gap-3 rounded-md bg-card stroke-gradient-card"
      >
        {/* The image is flush with the card on three edges, so the two strokes
          * land on the same line. Both are ::after overlays, and the card's
          * belongs to a later element in tree order, which put the flat card
          * stroke on top of the copper one — the wrong way round. `z-1` lifts
          * the image and its stroke above it: positive z-index descendants
          * paint after z-auto ones. The save button clears both at z-10. */}
        <Media
          experience={experience}
          className="relative z-1 h-20 w-27.5 shrink-0 rounded-md stroke-gradient"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px] pr-9">
          <OpenLink experience={experience} className="text-body-md text-foreground">
            {experience.title}
          </OpenLink>
          <p className="text-body-xs text-muted-foreground">{metaLine}</p>
          <p className="text-body-sm text-emphasis">
            <Price experience={experience} />
          </p>
        </div>
        <SaveButton
          saved={saved}
          label={experience.title}
          onToggle={() => onToggleSave?.(experience.experienceId)}
          style="Icon"
          /* The 20px glyph sits at 7px in the frame. The button is 32px with
           * the glyph centred, so 1px here puts the DRAWING back at 7px
           * (1 + 6 = 7) while the target grows outwards. */
          className="absolute top-px right-px z-10"
        />
      </article>
    )
  }

  if (variant === 'media-xs') {
    return (
      <article
        data-slot="experience-card"
        data-variant={variant}
        className="flex w-full items-center gap-3"
      >
        {/* 66x48. The design gives this a 12px radius, which is NOT on the
          * Radius scale — that goes 4, 16, 24 — and Figma binds no variable
          * to it, so it is a raw value in the file rather than a token. Using
          * `rounded-md` (16px) rather than inventing `rounded-[12px]`, since
          * CLAUDE.md's rule is to use the scale. Flagged: if 12 is deliberate
          * it wants a Radius/xs variable and a `npm run tokens`. */}
        <Media
          experience={experience}
          className="h-12 w-16.5 shrink-0 rounded-md stroke-gradient"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          {/* One line each, clipped. This card is a fixed 48px row in a list
            * of them, and a long title wrapping to two lines makes it 70 and
            * breaks the rhythm of the whole list. It is a pointer back to
            * something you have already seen, so the first few words are
            * enough — which is not true of the cards that are an offer.
            * `block` because truncation needs a block box and <a> is inline. */}
          <OpenLink
            experience={experience}
            className="block truncate text-body-md text-foreground"
          >
            {experience.title}
          </OpenLink>
          <p className="truncate text-body-xs text-muted-foreground">{metaLine}</p>
        </div>
      </article>
    )
  }

  /* media-sm-narrow — no save button, by design. */
  return (
    <article
      data-slot="experience-card"
      data-variant={variant}
      className="flex w-38 flex-col justify-center gap-3"
    >
      <Media
        experience={experience}
        className="h-27.5 w-full rounded-md stroke-gradient"
      />
      <div className="flex flex-col gap-[3px]">
        <OpenLink experience={experience} className="text-body-md text-foreground">
          {experience.title}
        </OpenLink>
        <p className="text-body-xs text-muted-foreground">{metaLine}</p>
        <p className="text-body-sm text-emphasis">
          <Price experience={experience} />
        </p>
      </div>
    </article>
  )
}

/** Skeletons match the shape they replace, so nothing shifts on load. */
export function ExperienceCardSkeleton({ variant }: { variant: Variant }) {
  if (variant === 'media-md') {
    return (
      <div
        data-slot="experience-card-skeleton"
        className="flex w-80 flex-col gap-2"
        aria-hidden="true"
      >
        <div className="h-45 rounded-lg bg-muted motion-safe:animate-pulse" />
        <div className="flex flex-col gap-1 px-2">
          <div className="h-5 w-3/4 rounded-sm bg-muted motion-safe:animate-pulse" />
          <div className="h-4 w-1/2 rounded-sm bg-muted motion-safe:animate-pulse" />
        </div>
      </div>
    )
  }
  if (variant === 'media-sm') {
    return (
      <div
        data-slot="experience-card-skeleton"
        className="flex w-80 items-center gap-3 rounded-md bg-card stroke-gradient-card"
        aria-hidden="true"
      >
        <div className="h-20 w-27.5 shrink-0 rounded-md bg-muted motion-safe:animate-pulse" />
        <div className="flex flex-1 flex-col gap-[3px]">
          <div className="h-4 w-3/4 rounded-sm bg-muted motion-safe:animate-pulse" />
          <div className="h-3 w-1/2 rounded-sm bg-muted motion-safe:animate-pulse" />
        </div>
      </div>
    )
  }
  if (variant === 'media-xs') {
    return (
      <div
        data-slot="experience-card-skeleton"
        className="flex w-full items-center gap-3"
        aria-hidden="true"
      >
        <div className="h-12 w-16.5 shrink-0 rounded-md bg-muted motion-safe:animate-pulse" />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <div className="h-4 w-3/4 rounded-sm bg-muted motion-safe:animate-pulse" />
          <div className="h-3 w-1/2 rounded-sm bg-muted motion-safe:animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="experience-card-skeleton"
      className="flex w-38 flex-col gap-3"
      aria-hidden="true"
    >
      <div className="h-27.5 rounded-md bg-muted motion-safe:animate-pulse" />
      <div className="h-4 w-3/4 rounded-sm bg-muted motion-safe:animate-pulse" />
    </div>
  )
}
