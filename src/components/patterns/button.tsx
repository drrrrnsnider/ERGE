import { Link } from 'react-router'
import { MoreHoriz } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * `Button` and `Button Icon` — our buttons, from the Figma component sets.
 *
 * NOT a restyled shadcn button, and the reason is structural rather than
 * cosmetic. `Type=Split` is two adjacent buttons with a 2px seam — a primary
 * action beside an overflow menu — and base-nova's Button is a single
 * `<button>` with class variants. No amount of styling produces two hit
 * areas. Three smaller reasons agree: ours is a pill where base-nova is
 * `rounded-lg` (which resolves to our 24px radius, and repointing that would
 * turn every card into a pill); the sizes are 32/44 against base-nova's
 * 32/40; and the axes ask different questions — Size x Type x Color versus
 * variant x size, with nowhere for "Split" to live.
 *
 * Styling it into shape would have meant editing src/components/ui/, which
 * is the one thing the token architecture exists to prevent.
 *
 * TYPE IS DERIVED, like Input's state. Passing an `icon` makes it Icon Left;
 * passing `onMore` makes it Split; neither makes it Text. A caller cannot
 * declare Split and then supply nothing for the second half.
 */

type Size = 'Sm' | 'Md'
type Color = 'Primary' | 'Subtle'
type IconComponent = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

/**
 * Primary is a filled copper pill with inverse SemiBold text. Subtle is the
 * card surface with a hairline and copper text at Regular — note the weight
 * changes with the colour, which is easy to miss and is why it lives here
 * rather than being applied per call site.
 */
const COLOR: Record<Color, string> = {
  Primary: 'bg-primary text-primary-foreground font-semibold',
  Subtle: 'border border-border bg-card text-primary font-normal',
}

/** Md has no Icon Left variant in the design; its padding is Md Text's. */
const SIZE: Record<Size, { base: string; text: string; withIcon: string }> = {
  Sm: { base: 'h-8', text: 'px-4', withIcon: 'gap-1 pl-2 pr-3' },
  Md: { base: 'h-11', text: 'px-8', withIcon: 'gap-1 px-8' },
}

export function Button({
  label,
  size = 'Sm',
  color = 'Primary',
  icon: Icon,
  onMore,
  moreLabel,
  className,
  ...props
}: React.ComponentProps<'button'> & {
  label: string
  size?: Size
  color?: Color
  /** Supplying one makes this `Type=Icon Left`. */
  icon?: IconComponent
  /** Supplying one makes this `Type=Split` — a second, separate button. */
  onMore?: () => void
  /** The overflow button's accessible name. Required whenever onMore is. */
  moreLabel?: string
}) {
  const sizing = SIZE[size]
  const shared = cn(
    'inline-flex items-center justify-center text-body-md whitespace-nowrap',
    'disabled:pointer-events-none disabled:opacity-50',
    COLOR[color],
  )

  const main = (
    <button
      type="button"
      data-slot="button"
      data-size={size}
      data-color={color}
      className={cn(
        shared,
        sizing.base,
        Icon ? sizing.withIcon : sizing.text,
        // Split: only the outer corners are round; the seam edge is square.
        onMore ? 'min-w-0 flex-1 rounded-l-full' : 'rounded-full',
        !onMore && className,
      )}
      {...props}
    >
      {Icon ? <Icon className="size-5 shrink-0" /> : null}
      {label}
    </button>
  )

  if (!onMore) return main

  /* Split is genuinely TWO buttons, so it is two <button> elements. Wrapping
   * one button around both would make the overflow unreachable, and nesting
   * buttons is invalid. The 2px gap is the design's seam. */
  return (
    <div data-slot="button-split" className={cn('flex gap-0.5', className)}>
      {main}
      <button
        type="button"
        onClick={onMore}
        aria-label={moreLabel ?? `More options for ${label}`}
        className={cn(
          shared,
          size === 'Sm' ? 'size-8' : 'size-11',
          'shrink-0 rounded-r-full pr-0.5',
        )}
      >
        <MoreHoriz className="size-5" />
      </button>
    </div>
  )
}

/**
 * `Button Icon` — a circular icon button on the card surface.
 *
 *   Md  48px, 22px glyph   the top bar and the search row
 *   Sm  32px, 20px glyph
 *
 * Renders as a link when `to` is given, because half its uses navigate and a
 * button that navigates loses middle-click, open-in-new-tab and the status
 * bar preview.
 */
export function ButtonIcon({
  label,
  icon: Icon,
  size = 'Md',
  to,
  onClick,
  className,
}: {
  label: string
  icon: IconComponent
  size?: Size
  /** Navigates instead of acting. Mutually exclusive with onClick. */
  to?: string
  onClick?: () => void
  className?: string
}) {
  const shape = cn(
    'grid shrink-0 place-items-center rounded-full border border-border bg-card',
    size === 'Md' ? 'size-12' : 'size-8',
    className,
  )
  const glyph = <Icon className={size === 'Md' ? 'size-[22px]' : 'size-5'} />

  if (to) {
    /* react-router's Link, not a raw <a> — a bare href would reload the
     * whole app and lose all client state on every tap. */
    return (
      <Link to={to} aria-label={label} data-slot="button-icon" className={shape}>
        {glyph}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-slot="button-icon"
      className={shape}
    >
      {glyph}
    </button>
  )
}
