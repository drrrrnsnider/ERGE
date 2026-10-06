import { SaveButton } from '@/components/app/save-button'
import { Badge } from '@/components/patterns/badge'
import { Button } from '@/components/patterns/button'
import { Menu } from '@/components/patterns/menu'
import { Link } from 'react-router'
import {
  CATEGORY_LABEL,
  priceLowBound,
  type Experience,
} from '@/lib/api/schemas/experience'
import { formatMoney } from '@/lib/money'
import { tabState, useCurrentTab } from '@/lib/tabs'
import { cn, joinMeta, META_SEPARATOR } from '@/lib/utils'

/**
 * The experience card, in every shape the design library defines.
 *
 * These are separate components in Figma — `Card / Media LG`, `MD`, `SM`,
 * `SM Full`, `SM Narrow` and `XS` — and the variant names here match them,
 * so a conversation about "media-sm" means the same thing in both places.
 * They are one component in code because they render the same data through
 * the same text block and differ only in arrangement; splitting them would
 * be six files that must be changed together every time the contract moves.
 *
 * They are NOT interchangeable, and each is used where the design uses it:
 *
 *   media-lg         the same thing full-bleed, 370 wide with a 250 hero.
 *                    The results list, one per row.
 *   media-md         320x180 hero + a rail of three thumbnails. Carries the
 *                    Elite treatment and a chrome-backed save button.
 *   media-sm         320-wide horizontal row, 110x80 thumbnail, bare save
 *                    icon with no button chrome.
 *   media-sm-full    the full-width row of a wishlist: 122-wide image
 *                    the card's height, a two-line title, the price in
 *                    Ovo, and a split Add to Cart / "•••". Its heart can
 *                    open a menu instead of toggling. (Card / Media SM Full)
 *   media-sm-narrow  154-wide column, 112-tall image, NO save button.
 *                    (152 x 110 until the Explore rails moved to 12px
 *                    gaps; the image kept its ratio.)
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

type Variant =
  | 'media-lg'
  | 'media-md'
  | 'media-sm'
  | 'media-sm-full'
  | 'media-sm-narrow'
  | 'media-xs'

/** Where a card goes. */
const hrefFor = (experience: Experience) =>
  `/experience/${experience.experienceId}`

/**
 * The card's link.
 *
 * It used to record "recently viewed" on click, because there was no detail
 * screen to record it on. That has moved to where it belongs — the screen
 * that actually shows you the thing — which fixes two things the stand-in
 * got wrong: it counted the TAP rather than the arrival, and it never saw
 * anyone who landed on an experience from a shared link.
 *
 * Kept as a named component rather than inlining `<Link>` at four call
 * sites, so where a card goes stays one decision.
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
  /* Carries the tab this card was tapped under onto the experience, so the
   * tab bar keeps it lit there — Library for a saved card, Explore for a
   * rail. See src/lib/tabs.ts. */
  const tab = useCurrentTab()
  return (
    <Link to={hrefFor(experience)} state={tabState(tab)} className={className}>
      {children}
    </Link>
  )
}

/**
 * The meta line — "Wynwood, Miami, FL  •  2.5 hrs" — on ONE line, always.
 *
 * Every card keeps every line to one (Darrin's option A): a long title or
 * a long place wrapping made the row crowded and uneven. When it does not
 * fit, the FIRST piece gives way and the last one stays whole — "Wynwood,
 * Mia…  •  2.5 hrs" — because the duration is short and is the part you
 * compare between cards, while the place is still recognisable cut short.
 *
 * The separator travels with the piece that stays, so it is never the
 * thing that gets cut. The text in the page is the whole line either way —
 * the "…" is drawn by CSS — so a screen reader still reads all of it.
 */
function MetaLine({
  parts,
  className,
}: {
  parts: ReadonlyArray<string | null | undefined | false>
  className?: string
}) {
  const present = parts.filter((part): part is string => Boolean(part))
  const kept = present.length > 1 ? present.at(-1) : undefined
  const giving = joinMeta(kept === undefined ? present : present.slice(0, -1))
  return (
    <p className={cn('flex min-w-0 whitespace-nowrap', className)}>
      {/* min-w-0 so a flex item may shrink below its text and truncate. */}
      <span className="min-w-0 truncate">{giving}</span>
      {kept !== undefined ? (
        <span className="shrink-0">
          {META_SEPARATOR}
          {kept}
        </span>
      ) : null}
    </p>
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
  saveMenu,
  moreMenu,
  onAddToCart,
  className,
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
  /**
   * media-sm-full only. Menu items for the heart, when tapping it should
   * ASK rather than toggle — a wishlist row, where it offers "Remove from
   * Wishlist" or "Delete from Library" (Darrin, 2026-10-06).
   */
  saveMenu?: React.ReactNode
  /** media-sm-full only. Menu items for the "•••" beside Add to Cart. */
  moreMenu?: React.ReactNode
  /** media-sm-full only. */
  onAddToCart?: () => void
  /**
   * For the card's outer box — in practice its width, where a screen lays
   * cards out differently from a rail: Library's list runs `media-sm` the
   * full width of the screen, where Explore's rail fixes it at 320. Applied
   * to every variant's root, so it never silently does nothing.
   */
  className?: string
}) {
  const duration = experience.details.find((d) => d.label === 'Duration')?.value

  const big = variant === 'media-md' || variant === 'media-lg'

  /* The two sizes deliberately show different metadata — the large cards
   * lead with the descriptor, the compact ones with where it is. */
  const meta = big
    ? [experience.summary, duration]
    : [experience.location.address, duration]

  if (big) {
    /* media-lg is media-md at full width, so they share this branch rather
     * than being two near-identical copies. Everything about them is the
     * same — 180px of media, a 4px gap, three thumbs, the save button on the
     * first one, the same text block — and only the widths differ: 320 with
     * a 230 hero in a rail, 370 with a 250 hero in the results list.
     *
     * The wide one sizes its hero and rail by RATIO rather than in pixels,
     * because it is full-bleed and has to hold that 250:116 split at
     * whatever width it lands on. The fixed one keeps its pixels, because it
     * lives in a horizontally scrolling rail where the card width is the
     * point. */
    const large = variant === 'media-lg'
    return (
      <article
        data-slot="experience-card"
        data-variant={variant}
        /* `isolate` keeps the Elite badge's and the save button's z-10 INSIDE
         * the card. Without it they competed with whatever the card sits
         * under — on the results screen that is the sticky filter header,
         * also z-10, and the cards won because they come later in the page:
         * badges and hearts scrolled OVER the categories. Raising the header
         * would only win until someone wrote a z-20 in a card. This cannot
         * be outbid — the same fix, for the same reason, as `main` in
         * RootLayout. */
        className={cn(
          'relative isolate flex flex-col gap-2',
          large ? 'w-full' : 'w-80',
          className,
        )}
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
            className={cn(
              'h-full',
              large ? 'min-w-0 flex-[250]' : 'w-57.5 shrink-0',
            )}
          />
          {experience.elite ? (
            /* `Badge Icon/Elite`, over the photo. The positioning and the
             * lift are this card's — see Badge. `data-slot` stays "badge";
             * tests find it by `data-variant="elite"`, since the class
             * `stroke-gradient-elite` is also the photo's own frame. */
            <Badge variant="elite" className="absolute top-2 left-2 z-10 shadow-lift">
              Elite
            </Badge>
          ) : null}
          <div
            className={cn(
              'flex min-w-0 flex-col gap-1',
              large ? 'flex-[116]' : 'flex-1',
            )}
          >
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
          {/* One line, cut with "…" — see MetaLine. `block` because
            * truncation needs a block box and <a> is inline. */}
          <OpenLink
            experience={experience}
            className="block truncate text-h3 font-medium text-foreground"
          >
            {experience.title}
          </OpenLink>
          <MetaLine parts={meta} className="text-body-md text-muted-foreground" />
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
        className={cn(
          'relative isolate flex w-80 items-center gap-3 rounded-md bg-card stroke-gradient-card',
          className,
        )}
      >
        {/* The image is flush with the card on three edges, so the two strokes
          * land on the same line. Both are ::after overlays, and the card's
          * belongs to a later element in tree order, which put the flat card
          * stroke on top of the copper one — the wrong way round. `z-1` lifts
          * the image and its stroke above it: positive z-index descendants
          * paint after z-auto ones. The save button clears both at z-10. */}
        {/* Pinned to the top. With every line kept to one the card is 80px
          * and this changes nothing — but text enlarged by the reader can
          * still make it taller, and then the picture stays put at the top
          * rather than floating in the middle. */}
        <Media
          experience={experience}
          className="relative z-1 h-20 w-27.5 shrink-0 self-start rounded-md stroke-gradient"
        />
        {/* py-2: the text never touches the tile's top or bottom edge, even
          * when enlarged text makes the card grow around it. */}
        <div className="flex min-w-0 flex-1 flex-col gap-[3px] py-2 pr-9">
          <OpenLink
            experience={experience}
            className="block truncate text-body-md text-foreground"
          >
            {experience.title}
          </OpenLink>
          <MetaLine parts={meta} className="text-body-xs text-muted-foreground" />
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

  if (variant === 'media-sm-full') {
    const { price } = experience
    return (
      <article
        data-slot="experience-card"
        data-variant={variant}
        /* `isolate` for the same reason as media-sm: the image's stroke and
         * the card's are ordered against each other and nothing else. */
        className={cn(
          /* ONE HEIGHT, whatever the title (Darrin, 2026-10-06): 155px is a
           * two-line card exactly, as drawn. A one-line title keeps the
           * height — the text stays pinned to the top and Add to Cart to the
           * bottom, so the space opens between them and the button lines up
           * row to row. A minimum, not a fixed height, so text enlarged by
           * the reader still grows the card rather than spilling out.
           *
           * 167 on a coarse pointer: the button grows from 32 to 44 there
           * (the theme's touch-target floor), so a two-line card is 12px
           * taller, and the minimum has to grow with it or one-line rows
           * would sit 12px shorter than two-line ones on a phone. */
          'relative isolate flex min-h-38.75 w-full items-start rounded-md bg-card stroke-gradient-card pointer-coarse:min-h-41.75',
          className,
        )}
      >
        {/* 122 wide and the full height of the card, however tall the
          * title makes it. */}
        <Media
          experience={experience}
          className="relative z-1 w-30.5 shrink-0 self-stretch rounded-md stroke-gradient"
        />
        {saveMenu ? (
          /* The heart sits on the picture at 7px, Style=Button. It is
           * always filled here — everything in a wishlist is saved — and
           * asks what "remove" means rather than guessing. */
          <Menu
            label={`Remove ${experience.title}`}
            align="start"
            trigger={
              <SaveButton
                saved={saved}
                label={experience.title}
                aria-label={`Remove ${experience.title}…`}
                className="absolute top-1.75 left-1.75 z-10"
              />
            }
          >
            {saveMenu}
          </Menu>
        ) : (
          <SaveButton
            saved={saved}
            label={experience.title}
            onToggle={() => onToggleSave?.(experience.experienceId)}
            className="absolute top-1.75 left-1.75 z-10"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-[3px] self-stretch p-3">
          {/* TWO lines here, the one exception to the one-line rule: this
            * card is drawn with room for it (Darrin, 2026-10-06). Then "…". */}
          <OpenLink
            experience={experience}
            className="line-clamp-2 text-body-lg text-foreground"
          >
            {experience.title}
          </OpenLink>
          {/* The category's word, or — for the four categories the design
            * has no word for — what the experience says it is. */}
          <p className="truncate text-body-md text-muted-foreground">
            {CATEGORY_LABEL[experience.category] ?? experience.summary}
          </p>
          <p className="flex items-end gap-1 pb-0.5">
            {price.kind === 'from' ? (
              <span className="pb-[3px] text-body-xs text-emphasis">from</span>
            ) : null}
            <span className="font-serif text-display-sm text-primary">
              {formatMoney(priceLowBound(price))}
            </span>
            {price.unit ? (
              <span className="pb-[3px] text-body-xs text-emphasis">per {price.unit}</span>
            ) : null}
          </p>
          <Button
            label="Add to Cart"
            onClick={onAddToCart}
            /* mt-auto: pinned to the bottom of the card. */
            className="mt-auto w-full"
            moreLabel={`More options for ${experience.title}`}
            renderMore={(button) => (
              <Menu label={`Options for ${experience.title}`} trigger={button}>
                {moreMenu}
              </Menu>
            )}
          />
        </div>
      </article>
    )
  }

  if (variant === 'media-xs') {
    return (
      <article
        data-slot="experience-card"
        data-variant={variant}
        className={cn('flex w-full items-center gap-3', className)}
      >
        {/* 66x48, 12px radius — `rounded-sm` since Radius/Sm is 12. This ran
          * at `rounded-md` (16) for a while because 12 was not on the scale
          * and the rule is to use the scale rather than invent a value; the
          * scale grew to fit it instead. */}
        <Media
          experience={experience}
          className="h-12 w-16.5 shrink-0 rounded-sm stroke-gradient"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          {/* One line each, clipped, like every card — a long title wrapping
            * would make this 48px row 70 and break the list's rhythm.
            * `block` because truncation needs a block box and <a> is inline. */}
          <OpenLink
            experience={experience}
            className="block truncate text-body-md text-foreground"
          >
            {experience.title}
          </OpenLink>
          <MetaLine parts={meta} className="text-body-xs text-muted-foreground" />
        </div>
      </article>
    )
  }

  /* media-sm-narrow — no save button, by design. */
  return (
    <article
      data-slot="experience-card"
      data-variant={variant}
      className={cn('flex w-38.5 flex-col justify-center gap-3', className)}
    >
      <Media
        experience={experience}
        className="h-28 w-full rounded-md stroke-gradient"
      />
      <div className="flex min-w-0 flex-col gap-[3px]">
        <OpenLink
          experience={experience}
          className="block truncate text-body-md text-foreground"
        >
          {experience.title}
        </OpenLink>
        <MetaLine parts={meta} className="text-body-xs text-muted-foreground" />
        <p className="text-body-sm text-emphasis">
          <Price experience={experience} />
        </p>
      </div>
    </article>
  )
}

/** Skeletons match the shape they replace, so nothing shifts on load. */
export function ExperienceCardSkeleton({
  variant,
  className,
}: {
  variant: Variant
  /** The same as the card's, so a skeleton is the width of what replaces it. */
  className?: string
}) {
  if (variant === 'media-md' || variant === 'media-lg') {
    return (
      <div
        data-slot="experience-card-skeleton"
        className={cn(
          'flex flex-col gap-2',
          variant === 'media-lg' ? 'w-full' : 'w-80',
          className,
        )}
        aria-hidden="true"
      >
        <div className="h-45 rounded-lg bg-muted motion-safe:animate-pulse" />
        <div className="flex flex-col gap-1 px-2">
          <div className="h-5 w-3/4 rounded-xs bg-muted motion-safe:animate-pulse" />
          <div className="h-4 w-1/2 rounded-xs bg-muted motion-safe:animate-pulse" />
        </div>
      </div>
    )
  }
  if (variant === 'media-sm') {
    return (
      <div
        data-slot="experience-card-skeleton"
        className={cn(
          'flex w-80 items-center gap-3 rounded-md bg-card stroke-gradient-card',
          className,
        )}
        aria-hidden="true"
      >
        <div className="h-20 w-27.5 shrink-0 rounded-md bg-muted motion-safe:animate-pulse" />
        <div className="flex flex-1 flex-col gap-[3px]">
          <div className="h-4 w-3/4 rounded-xs bg-muted motion-safe:animate-pulse" />
          <div className="h-3 w-1/2 rounded-xs bg-muted motion-safe:animate-pulse" />
        </div>
      </div>
    )
  }
  if (variant === 'media-sm-full') {
    return (
      <div
        data-slot="experience-card-skeleton"
        className={cn('flex h-38.75 w-full rounded-md bg-card stroke-gradient-card', className)}
        aria-hidden="true"
      >
        <div className="w-30.5 shrink-0 rounded-md bg-muted motion-safe:animate-pulse" />
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="h-5 w-3/4 rounded-xs bg-muted motion-safe:animate-pulse" />
          <div className="h-4 w-1/3 rounded-xs bg-muted motion-safe:animate-pulse" />
          <div className="h-7 w-1/2 rounded-xs bg-muted motion-safe:animate-pulse" />
          <div className="mt-auto h-8 w-full rounded-full bg-muted motion-safe:animate-pulse" />
        </div>
      </div>
    )
  }
  if (variant === 'media-xs') {
    return (
      <div
        data-slot="experience-card-skeleton"
        className={cn('flex w-full items-center gap-3', className)}
        aria-hidden="true"
      >
        <div className="h-12 w-16.5 shrink-0 rounded-md bg-muted motion-safe:animate-pulse" />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <div className="h-4 w-3/4 rounded-xs bg-muted motion-safe:animate-pulse" />
          <div className="h-3 w-1/2 rounded-xs bg-muted motion-safe:animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="experience-card-skeleton"
      className={cn('flex w-38.5 flex-col gap-3', className)}
      aria-hidden="true"
    >
      <div className="h-28 rounded-md bg-muted motion-safe:animate-pulse" />
      <div className="h-4 w-3/4 rounded-xs bg-muted motion-safe:animate-pulse" />
    </div>
  )
}
