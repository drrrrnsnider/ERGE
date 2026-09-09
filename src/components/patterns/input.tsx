import { useId } from 'react'
import { Close } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * `Input` — the form field, matching the Figma component set.
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
 *   Empty     border Border/Input,     text Text/Muted,    helper muted
 *   Filled    border Border/Input,     text Text/Primary,  helper muted
 *   Error     border Feedback/Error,   text Text/Muted,    helper ERROR
 *   Disabled  border Border/Default,   text Text/Disabled, helper muted
 *
 * FOCUS is a third axis in the design — Figma models it as a Type alongside
 * "Icon Left" and "Text" rather than as a State, but what it draws is just
 * the top hairline turning Border/Focus. So it is derived here too, from
 * :focus-within, and it does NOT override Error: an error border that
 * vanishes the moment you focus the field to fix it is the wrong trade. The
 * focus ring still appears in that case, so focus is never ambiguous.
 *
 * The field carries a 0.5px TOP border only — not a full outline. That is
 * deliberate in the design: a hairline catching light on the upper edge, so
 * the pill reads as raised rather than boxed.
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
 *   - the pill draws the global focus ring for the field inside it. The inner
 *     <input> carries `outline-none` so the ring is not drawn around the bare
 *     text, and before this the field had NO focus indicator at all —
 *     measured as `outline-style: none` while focused, which is a 2.4.7
 *     failure that an axe scan does not catch. theme.css now names
 *     [data-slot="input-field"] alongside :focus-visible so both get the one
 *     indicator.
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
            'flex h-12 w-full min-w-0 items-center gap-3 rounded-full border-t-[0.5px] bg-card px-3.5 py-2.5',
            error
              ? 'border-t-destructive'
              : disabled
                ? 'border-t-border'
                : 'border-t-input',
            /* Guarded on `!error` on purpose. A pseudo-class outranks a plain
             * utility whatever order they are written in, so without this the
             * copper hairline would silently win over the error one. */
            !error && 'focus-within:border-t-ring',
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
