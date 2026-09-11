import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * `Input Field Simple Compact` — a 32px pill holding a label and its value.
 *
 * Figma 168:2648. The budget's Min. and Max. in the search takeover, where
 * there is no room for `Input`'s label-above-helper-below chrome and the
 * slider underneath is doing the explaining.
 *
 * A FLAT Border/Default ring, deliberately, while nearly everything else moved
 * to a gradient. Checked rather than assumed: the component binds
 * Color/Border/Default and lists no gradient style, unlike FieldPill and
 * Button Icon which both gained one in the same pass.
 *
 * Label and value are the same colour — both Text/Muted. That reads oddly for
 * a field showing a real value, and it is what the design does: the pills are
 * a readout for the slider, not the primary way to set a budget.
 *
 * The value is a real input rather than text, so the pair can be typed into
 * as well as dragged. `<label>` is a real label, so tapping the word focuses
 * the field — the pill is small and the label is half of it.
 *
 * MEASURED: on a coarse pointer the inner input takes the 44px floor while the
 * pill stays 32px, so its tap target overhangs 6px above and below. That is
 * invisible — the input is transparent and unbordered — and it is deliberate:
 * CLAUDE.md names form fields as something that must never take the compact
 * opt-out, so the field keeps a thumb-sized target even though the drawing is
 * 32px. The cost is that whatever sits within 6px of this pill is inside its
 * target. Leave at least that much gap below it; in the search takeover the
 * slider is directly underneath and would otherwise lose taps near its track.
 */
export function FieldSimpleCompact({
  label,
  value,
  onChange,
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> & {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div
      data-slot="field-simple-compact"
      className={cn(
        'flex h-8 w-full min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3',
        className,
      )}
    >
      <label htmlFor={id} className="shrink-0 text-body-md text-muted-foreground">
        {label}
      </label>
      {/* `text-right` because the value sits at the far end of the pill, and
        * `min-w-0` so a long one shrinks rather than pushing the label out. */}
      <input
        {...props}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent text-right text-body-md text-muted-foreground outline-none"
      />
    </div>
  )
}
