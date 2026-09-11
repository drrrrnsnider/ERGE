import { useId } from 'react'
import { FieldSimpleCompact } from '@/components/patterns/field-simple-compact'
import { Input } from '@/components/patterns/input'
import { RangeSlider } from '@/components/patterns/range-slider'
import { formatMoney } from '@/lib/money'
import type { ExploreFilters } from '@/lib/api/schemas/explore'
import { cn } from '@/lib/utils'

/**
 * A budget as a range — a slider and two number fields, kept in step.
 *
 * ONE CONTROL, DRAWN TWO WAYS. Explore gives it a full panel with labelled
 * fields; the search takeover gives it two 32px readout pills above a bare
 * track. They are not two controls that happen to look similar: the value
 * handling below is identical and subtle enough that a second copy would
 * drift. Extracted from BudgetGroupControls when the takeover needed it,
 * which is what CLAUDE.md asks for instead of a near-duplicate.
 *
 * TWO CONTROLS FOR ONE VALUE, deliberately. The slider is for framing: drag
 * until the shape of the results looks right. The number fields are for
 * arriving with a figure already in mind — "we have three thousand" — which
 * a slider cannot express. On a phone the track is about 340px wide, so one
 * pixel is roughly thirty dollars: fine for coarse framing, useless for
 * "under 2,500". Moving either moves the other.
 *
 * The fields are also the escape hatch. The slider stops at BUDGET_CEILING
 * because a track has to end somewhere, but that ceiling is an affordance,
 * not a limit — type 40,000 into the field and it holds, and the upper thumb
 * simply parks at the end.
 *
 * Money is minor units everywhere else in the app. Here the user types whole
 * dollars, and the conversion happens at this edge, once.
 */

type Budget = ExploreFilters['budget']

/* Whole dollars. The slider's span, not a validation rule — see the note
 * above about the fields being the escape hatch.
 *
 * A thousand, because the default filter is 0-500 and nothing in the
 * catalogue costs more than $340: on a $10,000 track the default range
 * collapsed into two overlapping grabbers 14px apart, which is a slider you
 * cannot use. Half the track is the right home for the default. Revisit this
 * when flights and hotels land and the realistic totals move. */
const BUDGET_CEILING = 1_000
const BUDGET_STEP = 25

const toMinor = (major: number) => Math.max(0, Math.round(major)) * 100
const toMajor = (minor: number) => Math.round(minor / 100)

/** Digits only — so "$1,200" typed back in is 1200, not NaN. */
const parseAmount = (text: string) => Number(text.replace(/[^0-9]/g, '')) || 0

export function BudgetRange({
  value,
  onChange,
  variant = 'stacked',
  className,
}: {
  value: Budget
  onChange: (next: Budget) => void
  /**
   * `stacked`  slider, hint, then two labelled `Input`s — Explore.
   * `compact`  two readout pills, then a bare track — the search takeover.
   */
  variant?: 'stacked' | 'compact'
  className?: string
}) {
  const hintId = useId()
  const compact = variant === 'compact'

  const set = (patch: Partial<Budget>) => onChange({ ...value, ...patch })

  const slider = (
    <RangeSlider
      label="Budget"
      value={[toMajor(value.min), toMajor(value.max)]}
      onChange={([lo, hi]) => set({ min: toMinor(lo), max: toMinor(hi) })}
      min={0}
      /* The thumb parks at the end of the track when a field has been typed
       * past the ceiling; it does not drag the value back down. */
      max={Math.max(BUDGET_CEILING, toMajor(value.max))}
      step={BUDGET_STEP}
      format={{
        style: 'currency',
        currency: value.currency,
        maximumFractionDigits: 0,
      }}
      minLabel="Minimum budget"
      maxLabel="Maximum budget"
      /* The compact form puts the numbers in the two pills above the track,
       * so the slider's own readout would be the same figures a second time.
       * Hidden rather than removed — it still has to be named. */
      readout={compact ? 'hidden' : 'visible'}
    />
  )

  /* `min-w-0` because a <fieldset> carries a browser default of
   * `min-width: min-content` that no reset clears — without it the element
   * refuses to shrink and the two fields overflow rather than sharing the
   * row.
   *
   * aria-describedby on the fieldset, so the hint is announced when focus
   * enters the group rather than being loose text beside it. */
  return (
    <fieldset
      className={cn('flex min-w-0 flex-col', compact ? 'gap-2' : 'gap-4', className)}
      aria-describedby={hintId}
    >
      <legend className="sr-only">Budget</legend>

      {compact ? (
        <>
          {/* Fields ABOVE the track here, which is the reverse of the
            * stacked layout — the design reads the pills as the readout for
            * the slider beneath them. */}
          <div className="flex items-center gap-2">
            <FieldSimpleCompact
              label="Min."
              value={formatMoney({ amount: value.min, currency: value.currency })}
              onChange={(text) => set({ min: toMinor(parseAmount(text)) })}
              inputMode="numeric"
              aria-label="Minimum budget"
            />
            <FieldSimpleCompact
              label="Max."
              value={formatMoney({ amount: value.max, currency: value.currency })}
              onChange={(text) => set({ max: toMinor(parseAmount(text)) })}
              inputMode="numeric"
              aria-label="Maximum budget"
            />
          </div>
          {slider}
          {/* The takeover does not draw the hint, so it is carried for
            * screen readers only rather than dropped — the fieldset still
            * has to say what the number means, and "total for the group,
            * including fees" is the whole budget position. */}
          <p id={hintId} className="sr-only">
            Total for the group, including taxes and fees
          </p>
        </>
      ) : (
        <>
          {slider}
          <p id={hintId} className="text-sm text-muted-foreground">
            Total for the group, including taxes and fees
          </p>
          <div className="flex items-start gap-3">
            <Input
              label={`Min (${value.currency})`}
              value={String(toMajor(value.min))}
              onChange={(v) => set({ min: toMinor(Number(v) || 0) })}
              type="number"
              inputMode="numeric"
              min={0}
              step={5}
              className="flex-1"
            />
            <Input
              label={`Max (${value.currency})`}
              value={String(toMajor(value.max))}
              onChange={(v) => set({ max: toMinor(Number(v) || 0) })}
              type="number"
              inputMode="numeric"
              min={0}
              step={5}
              className="flex-1"
            />
          </div>
        </>
      )}
    </fieldset>
  )
}
