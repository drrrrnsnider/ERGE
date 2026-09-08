import { Minus, Plus } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
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
  const minId = `${id}-min`
  const maxId = `${id}-max`
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
      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium text-card-foreground">Budget</legend>
        <p id={hintId} className="text-sm text-muted-foreground">
          Total for the group, including taxes and fees
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor={minId} className="sr-only">
            Minimum budget in {budget.currency}
          </label>
          <input
            id={minId}
            type="number"
            inputMode="numeric"
            min={0}
            step={5}
            value={toMajor(budget.min)}
            aria-describedby={hintId}
            onChange={(e) => setBudget({ min: toMinor(e.target.valueAsNumber || 0) })}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground"
          />
          <span className="text-muted-foreground" aria-hidden="true">
            –
          </span>
          <label htmlFor={maxId} className="sr-only">
            Maximum budget in {budget.currency}
          </label>
          <input
            id={maxId}
            type="number"
            inputMode="numeric"
            min={0}
            step={5}
            value={toMajor(budget.max)}
            aria-describedby={hintId}
            onChange={(e) => setBudget({ max: toMinor(e.target.valueAsNumber || 0) })}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground"
          />
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-4">
        <label htmlFor={groupId} className="font-medium text-card-foreground">
          Group size
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Decrease group size"
            disabled={groupSize <= GROUP_MIN}
            onClick={() => setGroup(groupSize - 1)}
          >
            <Minus />
          </Button>
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
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Increase group size"
            disabled={groupSize >= GROUP_MAX}
            onClick={() => setGroup(groupSize + 1)}
          >
            <Plus />
          </Button>
        </div>
      </div>
    </div>
  )
}
