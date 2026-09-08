import { Heart } from 'lucide-react'
import { Link } from 'react-router'
import { Skeleton } from '@/components/patterns/skeleton'
import { Button } from '@/components/ui/button'
import type { Experience } from '@/lib/api/schemas/experience'
import type { RailVariant } from '@/lib/api/schemas/explore'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * The experience card — one component, driven by the Experience shape.
 *
 * The same object renders here, in search, on the PDP, in the cart and in a
 * chat package (api-contract.md). So this takes the FULL `Experience` and a
 * variant, never an Explore-specific subset — a later screen should reach for
 * this with a different variant, not build a lookalike. If you are about to
 * build a card that is 80% this one, extend the variant config instead.
 *
 * Variants (rails pick one):
 *   portrait  image above text — the default rail card
 *   compact   thumbnail beside text — dense lists ("Popular Nearby")
 *   small     narrow, three-up — secondary rails ("Unique Lodging")
 *
 * STRUCTURE
 * The whole card is a link to the PDP. The save button is a SIBLING of that
 * link, positioned over it, not a child: an interactive element inside
 * another is invalid HTML and breaks assistive tech. The article is the
 * container that holds both.
 *
 * PRICE
 * Two presentations, and they must be visually distinct
 * (interaction-spec.md, "Price and estimate states"). `final` is the amount
 * alone. `from` reads "from $45 + fees" — the words are the marker, so this
 * does not rely on colour (SC 1.4.1). Never an implied all-in figure.
 *
 * AVAILABILITY
 * `unknown` is legitimate and common: it renders "Select a date to check",
 * never an error. Shown on portrait and compact; a small card has no room
 * and the PDP will say it properly.
 *
 * NOT YET
 * - Save is a local toggle. Per user-flows.md §5, saving requires an
 *   account; the account prompt does not exist, so the toggle just toggles.
 * - The PDP route does not exist; the link lands on a "not built" screen.
 */
export type ExperienceCardVariant = RailVariant

const VARIANT = {
  portrait: {
    root: 'w-64 flex-col',
    media: 'aspect-[4/3] w-full',
    body: 'gap-1 pt-3',
    title: 'text-base',
    showAvailability: true,
  },
  compact: {
    root: 'w-80 flex-row items-stretch rounded-xl bg-card',
    media: 'size-24 shrink-0',
    body: 'gap-0.5 p-3',
    title: 'text-sm',
    showAvailability: true,
  },
  small: {
    root: 'w-36 flex-col',
    media: 'aspect-square w-full',
    body: 'gap-0.5 pt-2',
    title: 'text-sm',
    showAvailability: false,
  },
} as const

const AVAILABILITY_COPY = {
  available: 'Available',
  unavailable: 'Unavailable',
  unknown: 'Select a date to check',
} as const

export function ExperienceCard({
  experience,
  variant = 'portrait',
  badge,
  saved = false,
  onToggleSave,
  className,
}: {
  experience: Experience
  variant?: ExperienceCardVariant
  /** A rail-level marker such as "Elite". Not part of the Experience shape. */
  badge?: string
  saved?: boolean
  onToggleSave?: (experienceId: string) => void
  className?: string
}) {
  const v = VARIANT[variant]
  const image = experience.images[0]
  const duration = experience.details.find(
    (d) => d.label.toLowerCase() === 'duration',
  )?.value
  const meta = [experience.location.address, duration]
    .filter(Boolean)
    .join(' · ')

  return (
    <article
      data-slot="experience-card"
      data-variant={variant}
      className={cn('relative flex shrink-0', v.root, className)}
    >
      <Link
        to={`/experience/${experience.experienceId}`}
        className={cn('flex min-w-0 flex-1 rounded-xl', {
          'flex-col': variant !== 'compact',
          'flex-row': variant === 'compact',
        })}
      >
        {/* Media. An experience with no photo is a real case — a restaurant
          * that has not supplied one — so the fallback is a plain surface,
          * not a broken image. */}
        <div
          className={cn(
            'relative overflow-hidden rounded-xl bg-muted',
            v.media,
          )}
        >
          {image ? (
            <img
              src={image.url}
              alt={image.alt}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : null}
          {badge ? (
            <span className="absolute top-2 left-2 rounded-full bg-card px-2 py-0.5 text-xs font-medium text-card-foreground ring-1 ring-primary">
              {badge}
            </span>
          ) : null}
        </div>

        <div className={cn('flex min-w-0 flex-col', v.body)}>
          <h3 className={cn('truncate font-medium text-foreground', v.title)}>
            {experience.title}
          </h3>
          {meta ? (
            <p className="truncate text-xs text-muted-foreground">{meta}</p>
          ) : null}
          <PriceLine price={experience.price} />
          {v.showAvailability ? (
            <p className="text-xs text-muted-foreground">
              {AVAILABILITY_COPY[experience.availability.status]}
            </p>
          ) : null}
        </div>
      </Link>

      {onToggleSave ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-pressed={saved}
          aria-label={
            saved
              ? `Remove ${experience.title} from saved`
              : `Save ${experience.title}`
          }
          onClick={() => onToggleSave(experience.experienceId)}
          className="absolute top-2 right-2 rounded-full"
        >
          <Heart fill={saved ? 'currentColor' : 'none'} />
        </Button>
      ) : null}
    </article>
  )
}

function PriceLine({ price }: { price: Experience['price'] }) {
  if (price.kind === 'final') {
    return (
      <p className="text-sm font-medium text-foreground">
        {formatMoney({ amount: price.total, currency: price.currency })}
      </p>
    )
  }
  return (
    <p className="text-sm text-muted-foreground">
      from{' '}
      <span className="font-medium text-foreground">
        {formatMoney({ amount: price.base, currency: price.currency })}
      </span>{' '}
      + fees
    </p>
  )
}

/**
 * The loading shape of the card above — same footprint per variant, so the
 * rail does not jump when real cards land.
 */
export function ExperienceCardSkeleton({
  variant = 'portrait',
}: {
  variant?: ExperienceCardVariant
}) {
  const v = VARIANT[variant]
  return (
    <div
      data-slot="experience-card-skeleton"
      className={cn('flex shrink-0', v.root, {
        'flex-col': variant !== 'compact',
        'flex-row': variant === 'compact',
      })}
    >
      <Skeleton className={cn('rounded-xl', v.media)} />
      <div className={cn('flex flex-1 flex-col', v.body)}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
