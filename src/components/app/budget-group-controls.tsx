import { Add, Remove } from '@/components/icons'
import { Input } from '@/components/patterns/input'
import { useId } from 'react'
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
 * Its own component because it appears on Explore AND Search, and later as
 * a target on Cart, Trips and Lists. The caller owns the value; this only
 * renders and reports changes.
 *
 * Native number inputs, per interaction-spec.md's reasoning on date entry:
 * free, accessible, familiar, and a custom range slider is a substantial
 * accessible component the budget does not justify. The stepper buttons are
 * form controls, so they are full-size targets — `data-target="compact"` is
 * for chips, never fields.
 *
 * Money is minor units everywhere else. Here the user types whole dollars,
 * and the conversion happens at this edge, once.
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
  const hintId = `${id}-hint`

  const { budget, groupSize } = value
  const toMinor = (major: number) => Math.max(0, Math.round(major)) * 100
  const toMajor = (minor: number) => Math.round(minor / 100)

  const setBudget = (patch: Partial<ExploreFilters['budget']>) =>
    onChange({ ...value, budget: { ...budget, ...patch } })

  const setGroup = (next: number) =>
    onChange({
      ...value,
      groupSize: Math.min(GROUP_MAX, Math.max(GROUP_MIN, next)),
    })

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card p-4">
      {/* `min-w-0` because a <fieldset> carries a browser default of
        * `min-width: min-content` that no reset clears — without it the
        * element refuses to shrink and the two fields overflow the card
        * rather than sharing the row. */}
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="font-medium text-card-foreground">Budget</legend>
        <p id={hintId} className="text-sm text-muted-foreground">
          Total for the group, including taxes and fees
        </p>
        <div className="flex items-start gap-3">
          <Input
            label={`Min (${budget.currency})`}
            value={String(toMajor(budget.min))}
            onChange={(v) => setBudget({ min: toMinor(Number(v) || 0) })}
            type="number"
            inputMode="numeric"
            min={0}
            step={5}
            className="flex-1"
          />
          <Input
            label={`Max (${budget.currency})`}
            value={String(toMajor(budget.max))}
            onChange={(v) => setBudget({ max: toMinor(Number(v) || 0) })}
            type="number"
            inputMode="numeric"
            min={0}
            step={5}
            className="flex-1"
          />
        </div>
      </fieldset>

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
