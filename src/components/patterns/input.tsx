import { useId } from 'react'
import { Close } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * `Input` — the form field, matching the Figma component set.
 *
 * If you want the bare pill with no label, helper or validation — a search
 * field, or a row that opens something — that is `FieldPill` beside this,
 * which explains why the two are separate.
 *
 *
 * Four states x two types, the same axes the design uses:
 *
 *   State  Empty | Filled | Error | Disabled
 *   Type   Icon Left | Text        (a leading icon, or none)
 *
 * State is DERIVED, not passed. `Filled` is "has a value", `Error` is "has an
 * error", `Disabled` is the disabled attribute — so a caller cannot render a
 * field that says Filled while empty, or Error with no message. The design
 * names four states; the component makes three of them impossible to get
 * wrong and the fourth automatic.
 *
 * WHAT THE STATES CHANGE
 *
 *   Empty     stroke Border/Input,     text Text/Muted,    helper muted
 *   Filled    stroke Border/Input,     text Text/Primary,  helper muted
 *   Error     stroke Feedback/Error,   text Text/Muted,    helper ERROR
 *   Disabled  stroke Border/Default,   text Text/Disabled, helper muted
 *
 * FOCUS is a third axis in the design — Figma models it as a Type alongside
 * "Icon Left" and "Text" rather than as a State, but what it draws is just
 * the top hairline turning Border/Focus. So it is derived here too, from
 * :focus-within, and it does NOT override Error: an error border that
 * vanishes the moment you focus the field to fix it is the wrong trade. The
 * focus ring still appears in that case, so focus is never ambiguous.
 *
 * The field's ring is a 1px GRADIENT, full strength on the top edge and
 * gone by the bottom — the same light-from-above idea the whole system uses,
 * now drawn all the way round rather than on the top edge alone. It was a
 * top-only border until the design moved to a full ring.
 *
 * The colour is the only thing a state changes, so it is passed as
 * `--field-stroke` rather than as four separate stroke utilities that would
 * drift apart. `stroke-gradient-field` in theme.css reads it.
 *
 * ACCESSIBILITY, none of which is in the design file:
 *   - the label is a real <label>, so tapping it focuses the field
 *   - `required` renders a visible asterisk AND sets the attribute, rather
 *     than leaving the asterisk as decoration a screen reader never mentions
 *   - the helper is wired with aria-describedby, so it is announced with the
 *     field instead of being orphaned text nearby
 *   - an error sets aria-invalid and announces via role="alert", because a
 *     red border communicates nothing without sight (SC 1.4.1)
 *   - the clear button is a real button with its own label, not a decorative
 *     icon, and is hidden entirely when there is nothing to clear
 *   - focus is shown two ways, for two different situations. Click into the
 *     field and you get the border alone: you pointed at it, so you already
 *     know where typing will go. Tab into it and the pill also draws the
 *     focus ring, because moving between controls without pointing at them is
 *     the case that needs a strong signal.
 *
 *     That split is why it is not plain `:focus-visible`. The spec has text
 *     inputs match that ALWAYS, click included, so it cannot tell the two
 *     apart; main.tsx records the modality instead.
 *
 *     The measurement behind it: the border change on its own is Border/Input
 *     to Border/Focus, only 1.76:1, across an edge half a pixel tall. Plenty
 *     to confirm a field you just clicked; too subtle to track by keyboard.
 *     (The bottom-bar search field is a full 1px border going Border/Default
 *     to Border/Focus, a 5.62:1 change, so it was never the weak case.)
 */
export function Input({
  label,
  value,
  onChange,
  error,
  helper,
  leftIcon: LeftIcon,
  onClear,
  required = false,
  disabled = false,
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> & {
  label: string
  value: string
  onChange: (value: string) => void
  /** Present means the field is in its Error state. */
  error?: string
  helper?: string
  /** Supplying one makes this `Type=Icon Left`; omitting it, `Type=Text`. */
  leftIcon?: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement
  /** Supplying one shows the clear button once there is a value. */
  onClear?: () => void
}) {
  const id = useId()
  const describedBy = `${id}-help`
  const message = error ?? helper

  return (
    /* `min-w-0` because a flex item defaults to `min-width: auto`, which is
     * its CONTENT width — so an Input placed in a flex row grows to fit its
     * value and pushes out of its container instead of shrinking. */
    <div className={cn('flex w-full min-w-0 flex-col gap-3', className)}>
      <label
        htmlFor={id}
        className="flex gap-0.5 text-section-xxs font-semibold tracking-[0.08em] uppercase text-muted-foreground"
      >
        {label}
        {required ? (
          // aria-hidden because `required` on the input already announces it;
          // without this a screen reader reads a bare "star".
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </label>

      <div className="flex w-full min-w-0 flex-col gap-1">
        <div
          data-slot="input-field"
          className={cn(
            'flex h-12 w-full min-w-0 items-center gap-3 rounded-full stroke-gradient-field bg-card px-3.5 py-2.5',
            error
              ? '[--field-stroke:var(--destructive)]'
              : disabled
                ? '[--field-stroke:var(--border)]'
                : '[--field-stroke:var(--input)]',
            /* Guarded on `!error` on purpose. A pseudo-class outranks a plain
             * utility whatever order they are written in, so without this the
             * copper stroke would silently win over the error one. */
            !error && 'focus-within:[--field-stroke:var(--ring)]',
          )}
        >
          {LeftIcon ? (
            <LeftIcon
              className={cn(
                'size-[22px]',
                disabled ? 'text-disabled-foreground' : 'text-primary',
              )}
            />
          ) : null}

          {/* `props` FIRST, deliberately. Spread last, a caller passing
            * aria-describedby or className would silently clobber the
            * component's own wiring and detach the helper text from the
            * field — the exact bug this component exists to prevent. */}
          <input
            {...props}
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            required={required}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={message ? describedBy : undefined}
            className={cn(
              'h-full min-w-0 flex-1 bg-transparent text-body-md outline-none',
              'placeholder:text-muted-foreground',
              disabled ? 'text-disabled-foreground' : 'text-foreground',
            )}
          />

          {/* Only when there is something to clear — a permanently visible
            * clear button on an empty field is a target that does nothing. */}
          {onClear && value && !disabled ? (
            <button
              type="button"
              onClick={onClear}
              aria-label={`Clear ${label}`}
              data-target="compact"
              className="grid size-8 shrink-0 place-items-center rounded-full text-primary"
            >
              <Close className="size-[22px]" />
            </button>
          ) : null}
        </div>

        {message ? (
          <p
            id={describedBy}
            // An error has to reach a screen reader when it appears, not only
            // when the field is next focused.
            role={error ? 'alert' : undefined}
            className={cn(
              'text-body-xs',
              error ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  )
}
