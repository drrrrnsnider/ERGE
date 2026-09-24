import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowBack,
  FavoriteOutline,
  FavoriteSaved,
  MoreHoriz,
  Check,
} from '@/components/icons'
import { Button, ButtonIcon } from '@/components/patterns/button'
import { ButtonFlow } from '@/components/patterns/button-flow'
import { ErrorState } from '@/components/patterns/error-state'
import { Skeleton } from '@/components/patterns/skeleton'
import { TopScrim } from '@/components/patterns/top-scrim'
import { getExperience } from '@/lib/api/experiences'
import { toApiError } from '@/lib/api/schemas/error'
import { priceLowBound, type Experience } from '@/lib/api/schemas/experience'
import { formatMoney } from '@/lib/money'
import { addRecentlyViewed } from '@/lib/recents'
import { cn } from '@/lib/utils'

/**
 * The experience detail screen (Figma 230:9324).
 *
 * FULL BLEED, so it runs on `RootLayout chrome="bleed"`: the hero reaches
 * the top of the screen and passes under the status bar, with the nav bar
 * floating over it on a scrim. Reserving the notch would leave a strip of
 * background above the picture.
 *
 * THIS IS WHERE "RECENTLY VIEWED" IS RECORDED, and it takes the job back
 * from the card. Tapping a card was recording it because there was no detail
 * screen to record it on — a stand-in that got the wrong event: it counted
 * the tap rather than the arrival, and missed anyone landing here from a
 * shared link. Now the screen that shows you the thing is the thing that
 * remembers it.
 */

/* The concierge suggestion under the flow button. It reads as something
 * generated from the experience — a follow-on it could arrange — rather than
 * fixed copy, so it is written as a per-experience line with a stand-in
 * until the concierge can produce one. */
const SUGGESTION = 'Pick me up in a Waymo to grab a cocktail after'

export function ExperienceDetailRoute() {
  const navigate = useNavigate()
  const { experienceId = '' } = useParams()
  const [saved, setSaved] = useState(false)

  const query = useQuery({
    queryKey: ['experience', experienceId],
    queryFn: () => getExperience(experienceId),
    /* A missing experience is an answer, not a blip. Retrying a not_found
     * three times only delays telling someone it is gone. */
    retry: (count, error) => toApiError(error).code !== 'not_found' && count < 2,
  })

  const experience = query.data

  useEffect(() => {
    if (experience === undefined) return
    void addRecentlyViewed(experience.experienceId)
  }, [experience])

  return (
    <div className="relative min-h-full pb-8">
      {/* The nav bar floats over the hero. It owns its own top inset,
        * because `bleed` reserves none and this is the thing that has to
        * clear the notch. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2">
        <TopScrim />
        <ButtonIcon
          label="Back"
          icon={ArrowBack}
          onClick={() => void navigate(-1)}
          className="pointer-events-auto"
        />
        <div className="pointer-events-auto flex items-center gap-3">
          <ButtonIcon
            label={saved ? 'Saved' : 'Save'}
            icon={saved ? FavoriteSaved : FavoriteOutline}
            onClick={() => setSaved((on) => !on)}
          />
          <ButtonIcon label="More options" icon={MoreHoriz} onClick={() => {}} />
        </div>
      </header>

      {query.isPending ? <DetailSkeleton /> : null}

      {query.isError ? (
        <div className="px-4 pt-[calc(4rem+env(safe-area-inset-top))]">
          <ErrorState
            error={toApiError(query.error)}
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : null}

      {experience ? <Detail experience={experience} /> : null}
    </div>
  )
}

function Detail({ experience }: { experience: Experience }) {
  const duration = experience.details.find((d) => d.label === 'Duration')?.value
  const metaLine = [experience.location.address, duration].filter(Boolean).join(' • ')
  const price = priceLowBound(experience.price)
  const hero = experience.images[0]
  /* The strip under the hero is the REST of the gallery, so it starts at 1.
   * Four slots, and the last carries the count when there are more. */
  const strip = experience.images.slice(1, 5)

  return (
    <>
      <div className="flex flex-col">
        {/* 280 tall, full width, under the status bar. */}
        <div className="h-70 w-full overflow-hidden bg-muted">
          {hero ? (
            <img
              src={hero.url}
              alt={hero.alt}
              className="size-full object-cover"
            />
          ) : null}
        </div>

        {strip.length > 0 ? (
          <ul className="flex gap-1 px-4 py-2">
            {strip.map((image, index) => {
              const last = index === strip.length - 1
              const remaining = experience.images.length - 1 - strip.length
              return (
                <li
                  /* Index in the key, because a URL is not unique here —
                   * every fixture points at the same placeholder, and React
                   * warned about it. Two experiences legitimately sharing a
                   * photo would do the same in production. */
                  key={`${image.url}-${index}`}
                  className="relative h-16 min-w-0 flex-1 overflow-hidden rounded-xs bg-muted"
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  {last && remaining > 0 ? (
                    /* A button over the last thumbnail, not a caption: it
                      * opens the gallery, which does not exist yet, so it
                      * goes to the route that says so. */
                    <button
                      type="button"
                      className="absolute inset-0 grid place-items-center bg-background/70 px-1 text-body-xs text-emphasis"
                    >
                      See all {experience.images.length} photos
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-6 px-4 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 font-semibold text-foreground">{experience.title}</h1>
          <p className="text-body-md text-muted-foreground">{metaLine}</p>
          {experience.description ? (
            <p className="text-body-md text-muted-foreground">
              {experience.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <p className="flex items-baseline gap-2">
            <span className="text-display-md text-emphasis">
              {formatMoney(price)}
            </span>
            {experience.price.unit ? (
              <span className="text-body-lg text-muted-foreground">
                per {experience.price.unit}
              </span>
            ) : null}
          </p>

          {/* Split: the commitment and its overflow, which is what
            * `Type=Split` exists for — two hit areas, not one button with a
            * menu glued on. */}
          <Button
            label="Reserve Now"
            size="Md"
            onMore={() => {}}
            moreLabel={`More ways to book ${experience.title}`}
          />

          <div className="flex flex-col items-center gap-2">
            <ButtonFlow label="Build a trip with concierge" />
            <p className="text-center text-body-xs text-muted-foreground">
              {SUGGESTION}
            </p>
          </div>
        </div>

        {experience.included && experience.included.length > 0 ? (
          <section
            aria-labelledby="included"
            className="flex flex-col rounded-md bg-card px-4 py-2"
          >
            <h2
              id="included"
              className="py-2 text-section-xxs tracking-[0.08em] text-muted-foreground uppercase"
            >
              What&rsquo;s Included
            </h2>
            <ul>
              {experience.included.map((item, index) => (
                <li
                  key={item}
                  className={cn(
                    'flex items-center gap-2 py-2 text-body-md text-foreground',
                    /* Hairlines BETWEEN rows, not under every one — a rule
                     * under the last would read as the card being cut off
                     * rather than as a separator. */
                    index > 0 && 'border-t border-border',
                  )}
                >
                  <Check className="size-6 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col">
      <Skeleton className="h-70 w-full rounded-none" />
      <div className="flex flex-col gap-3 px-4 pt-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </div>
  )
}
