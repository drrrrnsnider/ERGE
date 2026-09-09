import { Add, Remove } from '@/components/icons'
import { Input } from '@/components/patterns/input'
import { RangeSlider } from '@/components/patterns/range-slider'
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
 * TWO CONTROLS FOR ONE VALUE, deliberately.
 *
 * The slider (`Input Slider` in Figma) is for framing: drag until the shape
 * of the results looks right. The number fields are for arriving with a
 * figure already in mind — "we have three thousand" — which a slider cannot
 * express. On a phone the track is about 340px wide, so one pixel is roughly
 * thirty dollars: fine for coarse framing, useless for "under 2,500".
 *
 * They are the same value, not two filters. Moving either moves the other.
 *
 * The fields are also the escape hatch. The slider stops at BUDGET_CEILING
 * because a track has to end somewhere, but that ceiling is an affordance,
 * not a limit — type 40,000 into the field and it holds, and the upper thumb
 * simply parks at the end.
 *
 * The stepper buttons are form controls, so they are full-size targets —
 * `data-target="compact"` is for chips, never fields.
 *
 * Money is minor units everywhere else. Here the user types whole dollars,
 * and the conversion happens at this edge, once.
 */

const GROUP_MIN = 1
const GROUP_MAX = 20

/* Whole dollars. The slider's span, not a validation rule — see the note
 * above about the fields being the escape hatch.
 *
 * A thousand, because the default filter is 0-500 and nothing in the catalogue
 * costs more than $340: on a $10,000 track the default range collapsed into
 * two overlapping grabbers 14px apart, which is a slider you cannot use.
 * Half the track is the right home for the default. Revisit this when
 * flights and hotels land and the realistic totals move. */
const BUDGET_CEILING = 1_000
const BUDGET_STEP = 25

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
      {/* `min-w-0` because a <fieldset> carries a browser default of
        * `min-width: min-content` that no reset clears — without it the
        * element refuses to shrink and the two fields overflow the card
        * rather than sharing the row. */}
      {/* aria-describedby on the fieldset, so the hint is announced when
        * focus enters the group rather than being loose text beside it. The
        * id was previously pointing at nothing. */}
      <fieldset
        className="flex min-w-0 flex-col gap-4"
        aria-describedby={hintId}
      >
        <legend className="sr-only">Budget</legend>

        <RangeSlider
          label="Budget"
          value={[toMajor(budget.min), toMajor(budget.max)]}
          onChange={([lo, hi]) =>
            setBudget({ min: toMinor(lo), max: toMinor(hi) })
          }
          min={0}
          /* The thumb parks at the end of the track when a field has been
           * typed past the ceiling; it does not drag the value back down. */
          max={Math.max(BUDGET_CEILING, toMajor(budget.max))}
          step={BUDGET_STEP}
          format={{
            style: 'currency',
            currency: budget.currency,
            maximumFractionDigits: 0,
          }}
          minLabel="Minimum budget"
          maxLabel="Maximum budget"
        />

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
