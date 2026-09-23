import { useState } from 'react'
import { DiscoverTune, KeyboardArrowDown, WatchAlert } from '@/components/icons'
import { BudgetRange } from '@/components/app/budget-range'
import { ChipFilter } from '@/components/patterns/chip-filter'
import { PickerSurface } from '@/components/patterns/picker-surface'
import { formatMoney } from '@/lib/money'
import type { DurationBand, SearchFilters } from '@/lib/api/schemas/search'
import { cn } from '@/lib/utils'

/**
 * The filter chips under the category row on the results screen.
 *
 * NOT FROM A DESIGN. The library has the `Chip Row` and `.Chip Filter`
 * components and the results frame shows four chips, but there is no frame
 * for what any of them opens. So the chips match the design and their sheets
 * are assembled entirely from parts that already exist — `PickerSurface`,
 * `BudgetRange`, plain option buttons — which is the cheapest thing to
 * restyle once they are drawn.
 *
 * THE CHIPS ARE NOT ALL THE SAME KIND OF CONTROL, which is why they do not
 * share one component:
 *
 *   All filters   icon only, opens everything at once
 *   Budget        opens a sheet, and SHOWS ITS VALUE when set
 *   Right Now     a plain toggle. No chevron in the design, and nothing to
 *                 choose — it is on or off
 *   Duration      opens a sheet of bands
 *
 * A chip that opens something carries `aria-expanded` and `aria-haspopup`;
 * one that toggles carries `aria-pressed`. ChipFilter deliberately leaves
 * that to the caller, because it cannot tell which it is.
 */

const DURATIONS: readonly { id: DurationBand; label: string }[] = [
  { id: 'any', label: 'Any length' },
  { id: 'under-1h', label: 'Under an hour' },
  { id: '1-2h', label: '1–2 hours' },
  { id: '2-4h', label: '2–4 hours' },
  { id: '4h-plus', label: '4 hours or more' },
]

/** What the budget chip says. Only the ceiling is worth the space. */
function budgetLabel(budget: SearchFilters['budget'], ceiling: number) {
  if (budget.max >= ceiling) return 'Any budget'
  return `${formatMoney({ amount: budget.max, currency: budget.currency })} or less`
}

export function SearchFilterRow({
  filters,
  onChange,
  ceiling,
}: {
  filters: SearchFilters
  onChange: (next: SearchFilters) => void
  /** The highest price in the results, so "Any budget" is a real statement. */
  ceiling: number
}) {
  const [open, setOpen] = useState<'all' | 'budget' | 'duration' | null>(null)
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch })

  const duration = DURATIONS.find((d) => d.id === filters.duration)
  const budgetOn = filters.budget.max < ceiling
  const durationOn = filters.duration !== 'any'

  const budgetPanel = (
    <div className="w-full min-w-64 pb-2">
      <BudgetRange
        variant="compact"
        value={filters.budget}
        ceiling={Math.max(1, Math.round(ceiling / 100))}
        onChange={(budget) => set({ budget })}
      />
    </div>
  )

  const durationPanel = (
    <ul className="flex w-full min-w-56 flex-col gap-1 pb-2">
      {DURATIONS.map((band) => {
        const on = band.id === filters.duration
        return (
          <li key={band.id}>
            <button
              type="button"
              /* A list where exactly one is chosen. `aria-pressed` on each
               * would say "four things are off and one is on"; a radio group
               * says "one of five", which is what it is. */
              role="radio"
              aria-checked={on}
              onClick={() => {
                set({ duration: band.id })
                /* Closes on choice — unlike the date range, one tap finishes
                 * the job, so a Done button would be a second tap that does
                 * nothing. */
                setOpen(null)
              }}
              className={cn(
                'flex h-11 w-full items-center rounded-md px-3 text-body-md',
                on ? 'bg-radial-card text-foreground' : 'text-muted-foreground',
              )}
            >
              {band.label}
            </button>
          </li>
        )
      })}
    </ul>
  )

  return (
    /* Not RailScroller — that snaps, which is right for cards and wrong for
     * a row of filters you are skimming. */
    <div
      role="group"
      aria-label="Filters"
      data-slot="search-filter-row"
      className="flex gap-2 overflow-x-auto px-4 scroll-px-4 [scrollbar-width:none]"
    >
      <PickerSurface
        title="All filters"
        open={open === 'all'}
        onOpenChange={(next) => setOpen(next ? 'all' : null)}
        doneLabel="Show results"
        trigger={
          <ChipFilter
            icon={DiscoverTune}
            aria-label="All filters"
            aria-haspopup="dialog"
          />
        }
      >
        <div className="flex w-full flex-col gap-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-h5 font-medium text-foreground">Budget</h3>
            {budgetPanel}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-h5 font-medium text-foreground">Duration</h3>
            <div role="radiogroup" aria-label="Duration">
              {durationPanel}
            </div>
          </section>
        </div>
      </PickerSurface>

      <PickerSurface
        title="Budget"
        open={open === 'budget'}
        onOpenChange={(next) => setOpen(next ? 'budget' : null)}
        doneLabel="Show results"
        trigger={
          <ChipFilter
            label={budgetLabel(filters.budget, ceiling)}
            icon={KeyboardArrowDown}
            iconPosition="right"
            active={budgetOn}
            aria-haspopup="dialog"
          />
        }
      >
        {budgetPanel}
      </PickerSurface>

      {/* No sheet: there is nothing to choose. */}
      <ChipFilter
        label="Right Now"
        icon={WatchAlert}
        active={filters.availableNow}
        aria-pressed={filters.availableNow}
        onClick={() => set({ availableNow: !filters.availableNow })}
      />

      <PickerSurface
        title="Duration"
        open={open === 'duration'}
        onOpenChange={(next) => setOpen(next ? 'duration' : null)}
        trigger={
          <ChipFilter
            label={durationOn ? (duration?.label ?? 'Duration') : 'Duration'}
            icon={KeyboardArrowDown}
            iconPosition="right"
            active={durationOn}
            aria-haspopup="dialog"
          />
        }
      >
        <div role="radiogroup" aria-label="Duration">
          {durationPanel}
        </div>
      </PickerSurface>
    </div>
  )
}
