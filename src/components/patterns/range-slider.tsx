import { Slider } from '@base-ui/react/slider'
import { cn } from '@/lib/utils'

/**
 * `RangeSlider` — the `Input Slider` component (Figma 168:2655), which is a
 * TWO-thumb slider: a 2px bar in Border/Default, an Action/Primary highlight
 * between the thumbs, and two 32px grabbers on Surface/Card carrying the
 * card stroke gradient and the lift shadow.
 *
 * WHY BASE UI AND NOT A HAND-ROLLED ONE
 *
 * A two-thumb slider is the most expensive accessible component on this
 * screen: two independently focusable values, arrow / Home / End / PageUp
 * keys, aria-valuenow and aria-valuetext kept in sync, pointer capture, and
 * thumbs that must not cross. Base UI renders a real `<input type="range">`
 * inside each thumb, so all of that is the platform's rather than ours. It is
 * already a dependency; writing this by hand would be several hundred lines
 * of exactly the code that is easiest to get subtly wrong.
 *
 * WHY NOT `shadcn add slider`
 *
 * Different reason from Button. There is no structural mismatch here — the
 * vendored slider is the same Base UI primitive underneath. But its geometry
 * is upstream's (a thick track, a small thumb) and ours is Figma's (a 2px
 * hairline and a 32px grabber), and changing that would mean editing
 * `src/components/ui/`. Composing the primitive here keeps that folder
 * byte-identical while the design stays exact.
 *
 * TOUCH TARGETS. The grabber is drawn at 32px because the design says 32px.
 * The thing you actually press is the `<input type="range">` inside it, which
 * theme.css raises to 44px on coarse pointers — so the hit area is
 * thumb-sized on a phone while the drawing stays honest. Visual size and
 * target size are allowed to differ; 2.5.8 measures the latter. This is why
 * it does NOT carry `data-target="compact"`, which would be wrong twice over:
 * it is a form control, and it does not need the opt-out.
 */
export function RangeSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  minLabel,
  maxLabel,
  readout = 'visible',
  className,
}: {
  /** Names the group. Rendered visibly unless `hidden` is wanted upstream. */
  label: string
  value: readonly [number, number]
  onChange: (next: readonly [number, number]) => void
  min: number
  max: number
  step?: number
  /** Passed to Intl.NumberFormat — makes aria-valuetext say "$1,200". */
  format?: Intl.NumberFormatOptions
  /** The lower thumb's accessible name. */
  minLabel: string
  /** The upper thumb's accessible name. */
  maxLabel: string
  /**
   * Whether the name and the current range are drawn above the track.
   *
   * `hidden` keeps both in the accessibility tree and takes them off the
   * screen — the search takeover draws a bare track under two readout pills
   * that already say the numbers, so showing them again would be saying it
   * twice visually while removing them entirely would leave the slider
   * unnamed. There is no third option here: a slider with no accessible
   * name fails 4.1.2.
   */
  readout?: 'visible' | 'hidden'
  className?: string
}) {
  return (
    <Slider.Root
      value={value as readonly number[]}
      onValueChange={(next) => {
        const [lo, hi] = next as readonly number[]
        if (lo !== undefined && hi !== undefined) onChange([lo, hi])
      }}
      min={min}
      max={max}
      step={step}
      format={format}
      /* A budget whose minimum has been dragged past its maximum is not a
       * state worth being able to reach, so the thumbs stop at each other
       * rather than pushing or swapping. */
      thumbCollisionBehavior="none"
      /* Figma draws the grabber flush INSIDE the track at either end, not
       * hanging half-off it. That is this alignment, not the default. */
      thumbAlignment="edge"
      className={cn('flex w-full flex-col gap-2', className)}
    >
      <div
        className={cn(
          'flex items-baseline justify-between gap-4',
          readout === 'hidden' && 'sr-only',
        )}
      >
        <Slider.Label className="font-medium text-card-foreground">
          {label}
        </Slider.Label>
        {/* An <output>, so the pair is announced as the group's value rather
          * than read as two loose numbers. */}
        <Slider.Value className="text-body-sm text-muted-foreground">
          {(formatted) => `${formatted[0]} – ${formatted[1]}`}
        </Slider.Value>
      </div>

      {/* 32px tall: the control is as tall as its grabbers, and the bar is
        * centred inside it. */}
      <Slider.Control className="flex h-8 w-full touch-none items-center">
        <Slider.Track className="h-0.5 w-full rounded-full bg-border">
          <Slider.Indicator className="h-full rounded-full bg-primary" />
          {[minLabel, maxLabel].map((thumbLabel, index) => (
            <Slider.Thumb
              key={thumbLabel}
              index={index}
              getAriaLabel={() => thumbLabel}
              /* The same ring as Input's field, deliberately, and now the
               * same technique too: a 1px gradient of Border/Input fading to
               * nothing down the grabber. It was a top-only hairline until
               * the design took every field ring all the way round.
               *
               * Border/Input, not Border/Default: this node's variables name
               * it, and it is several times brighter. Border/Input is the
               * role for a control boundary, Border/Default is decorative
               * separation, and the flattened MCP code shows neither — the
               * variable list is the thing to read. `stroke-gradient-field`
               * already defaults to Border/Input, so nothing is passed.
               *
               * That utility sets `position: relative`, which is harmless
               * here: Base UI positions the thumb with an INLINE style, and
               * inline styles outrank utilities. Measured, not assumed. */
              className="size-8 rounded-full stroke-gradient-field bg-card shadow-lift"
            />
          ))}
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  )
}
