import { SaveButton } from '@/components/app/save-button'
import { Elite as EliteIcon } from '@/components/icons'
import { Link } from 'react-router'
import { priceLowBound, type Experience } from '@/lib/api/schemas/experience'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * The experience card, in the three shapes the design library defines.
 *
 * These are three separate components in Figma — `Card / Media MD`,
 * `Card / Media SM` and `Card / Media SM Narrow` — and the variant names
 * here match them exactly, so a conversation about "media-sm" means the same
 * thing in both places. They are one component in code because they render
 * the same data through the same text block and differ only in arrangement;
 * splitting them would be three files that must be changed together every
 * time the contract moves.
 *
 * They are NOT interchangeable, and each is used where the design uses it:
 *
 *   media-md         320x180 hero + a rail of three thumbnails. Carries the
 *                    Elite treatment and a chrome-backed save button.
 *   media-sm         320-wide horizontal row, 110x80 thumbnail, bare save
 *                    icon with no button chrome.
 *   media-sm-narrow  152-wide column, 110-tall image, NO save button.
 *
 * The card is one link with the save button layered on top — not a link
 * wrapping a button, which is invalid and unusable by keyboard. The link's
 * accessible name carries the title, so the save button only has to name
 * itself and the thing it acts on.
 */

type Variant = 'media-md' | 'media-sm' | 'media-sm-narrow'

/** Where a card goes. The PDP is not built; the route reports what it got. */
const hrefFor = (experience: Experience) =>
  `/experience/${experience.experienceId}`

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
  return (
    <>
      {price.kind === 'from' ? (
        <span className="text-muted-foreground">from </span>
      ) : null}
      {amount}
      {price.unit ? (
        <span className="text-muted-foreground"> / {price.unit}</span>
      ) : null}
    </>
  )
}

/** `Badge Icon/Elite` — 32px pill, icon plus label, on the hero image. */
function EliteBadge() {
  return (
    <p className="absolute top-2 left-2 z-10 flex h-8 items-center gap-1 rounded-full border border-ring bg-card/90 pr-3 pl-2 text-body-md text-emphasis shadow-lift">
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
  saved,
  onToggleSave,
}: {
  experience: Experience
  variant: Variant
  saved: boolean
  onToggleSave: (experienceId: string) => void
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
            /* Elite replaces the gradient with a solid copper stroke — that
             * swap is the whole point of the treatment. */
            experience.elite
              ? 'border border-primary'
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
            onToggle={() => onToggleSave(experience.experienceId)}
            style="Button"
            className="absolute top-2 right-2 z-10"
          />
        </div>
        <div className="flex flex-col gap-1 px-2">
          <Link to={hrefFor(experience)} className="text-h3 font-medium text-foreground">
            {experience.title}
          </Link>
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
        className="relative flex w-80 items-center gap-3 rounded-md bg-card stroke-gradient-card"
      >
        <Media
          experience={experience}
          className="h-20 w-27.5 shrink-0 rounded-md stroke-gradient"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px] pr-9">
          <Link to={hrefFor(experience)} className="text-body-md text-foreground">
            {experience.title}
          </Link>
          <p className="text-body-xs text-muted-foreground">{metaLine}</p>
          <p className="text-body-sm text-emphasis">
            <Price experience={experience} />
          </p>
        </div>
        <SaveButton
          saved={saved}
          label={experience.title}
          onToggle={() => onToggleSave(experience.experienceId)}
          style="Icon"
          className="absolute top-[7px] right-[7px] z-10"
        />
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
        <Link to={hrefFor(experience)} className="text-body-md text-foreground">
          {experience.title}
        </Link>
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
