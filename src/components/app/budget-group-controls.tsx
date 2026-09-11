import { Add, Remove } from '@/components/icons'
import { useId } from 'react'
import { BudgetRange } from '@/components/app/budget-range'
import { ButtonIcon } from '@/components/patterns/button'
import type { ExploreFilters } from '@/lib/api/schemas/explore'

/**
 * Budget and group size — "the constants" (user-flows.md §0).
 *
 * Budget is the organising principle of the interface, not a filter tucked
 * in a menu (design-brief.md). It is a min/max range, TOTAL not per person,
 * inclusive of taxes and fees where the vendor supplies them. Group size is
 * paired with it: it changes the maths, not what is shown.
 *
 * This is the EXPLORE pairing: the budget range plus group size. The budget
 * half is `BudgetRange`, which the search takeover also uses in its compact
 * form — everything about how a slider and two fields stay in step lives
 * there, not here.
 *
 * Group size is paired with budget because it changes the maths, not what is
 * shown. The stepper buttons are form controls, so they are full-size
 * targets — `data-target="compact"` is for chips, never fields.
 */

const GROUP_MIN = 1
const GROUP_MAX = 20

export function BudgetGroupControls({
  value,
  onChange,
}: {
  value: ExploreFilters
  onChange: (next: ExploreFilters) => void
}) {
  const id = useId()
  const groupId = `${id}-group`

  const { budget, groupSize } = value

  const setGroup = (next: number) =>
    onChange({
      ...value,
      groupSize: Math.min(GROUP_MAX, Math.max(GROUP_MIN, next)),
    })

  return (
    /* NOT a card, because everything inside it already is one. The grabbers
     * and both fields are Surface/Card — the design's way of saying "this is
     * the raised thing you touch" — and a Surface/Card panel underneath them
     * made the grabber the exact same colour as its own background. On the
     * page surface the layering reads the way the design draws it: controls
     * on Base, nothing stacked.
     *
     * This does NOT fix the contrast, and it would be dishonest to say it
     * did. Measured: Card on Base is 1.09:1 and the Border/Default hairline
     * is 1.27:1, so what actually makes a control findable here is its drop
     * shadow. That is below 1.4.11's 3:1 and it is true of every pill and
     * card on this screen, not just the slider — a token decision, not
     * something to patch locally. Flagged rather than worked around. */
    <div className="flex flex-col gap-4">
      <BudgetRange
        value={budget}
        onChange={(next) => onChange({ ...value, budget: next })}
      />

      <div className="flex items-center justify-between gap-4">
        <label htmlFor={groupId} className="font-medium text-card-foreground">
          Group size
        </label>
        <div className="flex items-center gap-2">
          <ButtonIcon
            label="Decrease group size"
            icon={Remove}
            size="Sm"
            onClick={() => setGroup(groupSize - 1)}
          />
          <input
            id={groupId}
            type="number"
            inputMode="numeric"
            min={GROUP_MIN}
            max={GROUP_MAX}
            value={groupSize}
            onChange={(e) => setGroup(e.target.valueAsNumber || GROUP_MIN)}
            className="h-11 w-16 rounded-lg border border-input bg-background text-center text-foreground"
          />
          <ButtonIcon
            label="Increase group size"
            icon={Add}
            size="Sm"
            onClick={() => setGroup(groupSize + 1)}
          />
        </div>
      </div>
    </div>
  )
}
