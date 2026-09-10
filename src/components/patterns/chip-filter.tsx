import { Link } from 'react-router'
import { cn } from '@/lib/utils'

/**
 * `.Chip Filter` — the 32px pill used for filters and recent searches.
 *
 * Figma 168:2707. Three types and an active state, five symbols in all:
 *
 *   Icon Only   32x32, glyph alone. Opens the full filter sheet.
 *   Icon Left   glyph then label. A filter that is simply on or off.
 *   Icon Right  label then glyph. A filter that opens something — the glyph
 *               is a chevron, and the label shows the current value.
 *
 * There is deliberately no `Icon Only, Active=Yes` in the set, so an icon-only
 * chip cannot be active. That is why `active` is only read when there is a
 * label: a lone glyph has nowhere to show a value, so "on" would be invisible.
 *
 * WHAT ACTIVE CHANGES
 *
 *   inactive  border Border/Default,      label Action/Primary
 *   active    border Border/Subtle Focus, label Text/Primary, plus the
 *             `Radial + Card` glow behind it
 *
 * Note the label gets DARKER-to-lighter, not brighter, when active: copper
 * when off, Text/Primary when on. That reads oddly written down and is what
 * the design does — the glow and the ring carry the emphasis instead.
 *
 * THIS IS WHAT `data-target="compact"` IS FOR. CLAUDE.md names filter chips as
 * the example of a control that may sit at 32px rather than the 44px coarse
 * pointer floor, and this is the first thing in the codebase to use the
 * opt-out for its stated purpose rather than to preserve a drawing.
 *
 * Renders a link when given `to` — a recent search navigates, and a button
 * that navigates loses middle-click and open-in-new-tab. Everything else is a
 * button. ARIA for the state belongs to the caller: a chip that toggles wants
 * `aria-pressed`, one that opens a sheet wants `aria-expanded` and
 * `aria-haspopup`, and the component cannot tell which it is.
 */

type IconComponent = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

export function ChipFilter({
  label,
  icon: Icon,
  iconPosition = 'left',
  active = false,
  to,
  className,
  ...props
}: React.ComponentProps<'button'> & {
  /** Omit for `Type=Icon Only`. */
  label?: string
  icon: IconComponent
  /** `left` is `Type=Icon Left`; `right` is `Type=Icon Right`. */
  iconPosition?: 'left' | 'right'
  active?: boolean
  /** Navigates instead of acting. */
  to?: string
}) {
  const iconOnly = label === undefined
  // Icon-only has no active symbol in the set, so it can never be on.
  const on = active && !iconOnly

  const shape = cn(
    'inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border text-body-md whitespace-nowrap',
    iconOnly
      ? 'size-8'
      : iconPosition === 'left'
        ? 'pr-3 pl-2'
        : 'pr-2 pl-3',
    on
      ? 'border-border-subtle bg-radial-card text-foreground'
      : 'border-border text-primary',
    className,
  )

  const glyph = <Icon className="size-5 shrink-0" aria-hidden="true" />
  const content =
    iconPosition === 'left' ? (
      <>
        {glyph}
        {label}
      </>
    ) : (
      <>
        {label}
        {glyph}
      </>
    )

  if (to) {
    return (
      <Link to={to} data-slot="chip-filter" data-target="compact" className={shape}>
        {content}
      </Link>
    )
  }
  return (
    <button
      type="button"
      data-slot="chip-filter"
      data-target="compact"
      className={shape}
      {...props}
    >
      {content}
    </button>
  )
}
