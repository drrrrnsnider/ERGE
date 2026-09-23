import type { Experience } from '@/lib/api/schemas/experience'
import { priceLowBound } from '@/lib/api/schemas/experience'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * The surface the results sheet sits on, standing in for a real map.
 *
 * THERE IS NO MAP YET and this does not pretend otherwise. No provider has
 * been chosen, and choosing one is a real decision — cost per load, an API
 * key that has to survive a Capacitor build, and offline behaviour on a
 * phone. Until then the screen needs something to sit on, and a flat grey
 * box would make the whole layout read as broken rather than as unfinished.
 *
 * PIN POSITIONS ARE NOT GEOGRAPHIC. They are derived from the experience id,
 * so they are stable between renders — the same result lands in the same
 * place every time, which is what stops the screen looking like it is
 * shuffling — but they say nothing about where anything is. When a real map
 * lands, positions come from `experience.location` and this whole file goes.
 *
 * It is `aria-hidden` and carries no interactive pins. A decorative surface
 * that cannot be read should not be in the tab order pretending to be a map,
 * and every result it stands for is in the list below as real text.
 */

/** Stable, evenly spread, and deliberately not geography. */
function scatter(id: string): { left: number; top: number } {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  /* Kept well inside the edges so a pin is never half off the surface. */
  return {
    left: 12 + (hash % 1000) / 1000 * 70,
    top: 14 + ((hash >>> 10) % 1000) / 1000 * 60,
  }
}

export function MapPlaceholder({
  items,
  className,
}: {
  items: readonly Experience[]
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      data-slot="map-placeholder"
      className={cn('relative overflow-hidden bg-muted', className)}
    >
      {/* Enough texture to read as a surface rather than a loading block,
        * without drawing streets that would be a lie about a real place. */}
      <div className="absolute inset-0 bg-radial-card opacity-60" />

      {items.slice(0, 12).map((experience, index) => {
        const { left, top } = scatter(experience.experienceId)
        /* The first few carry their price, as the design does — a map of
         * identical dots tells you nothing, and the price is the one number
         * worth reading before you commit to tapping. */
        const labelled = index < 3
        return (
          <span
            key={experience.experienceId}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            {labelled ? (
              <span className="rounded-full stroke-gradient bg-card px-2 py-1 text-body-xs whitespace-nowrap text-emphasis shadow-lift">
                {formatMoney(priceLowBound(experience.price))}
              </span>
            ) : (
              <span className="block size-2.5 rounded-full bg-primary/50" />
            )}
          </span>
        )
      })}
    </div>
  )
}
