import { Elite as EliteIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

type IconComponent = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

/**
 * The badge family from the Figma component set: a short label in a pill
 * that says what something IS, not something you can press. Three variants,
 * one component, because they are one idea drawn three ways:
 *
 *   icon   `Badge Icon` (168:2895)        a category, beside a price
 *          Surface/Card fill, no edge. 18px glyph, gap 6, pl 12 / pr 16.
 *          Body/Medium in Action/Primary.
 *
 *   elite  `Badge Icon/Elite` (168:2969)  the Elite mark on a photo
 *          Card at 90% with the copper Elite gradient edge. 20px gradient
 *          glyph, gap 4, pl 8 / pr 12. Body/Medium in Text/Secondary.
 *
 *   text   `Badge Text` (168:3257)        a label on a promo, "ERGE Guides"
 *          Action/Primary fill, Text/Inverse at 12 SemiBold, 10 x 4.
 *
 * `icon` and `elite` are both 32px; `text` is as tall as its words, which is
 * how the design draws it. The two that existed — an EliteBadge inside the
 * experience card and a Badge inside the editorial card — were each a
 * private copy of one variant. Adding `Badge Icon` would have made a third,
 * so they became this instead.
 *
 * WHERE IT SITS IS THE CALLER'S. The Elite badge floats over a photo
 * (absolute, with a shadow to lift it off the picture); the category badge
 * sits in a row beside a price. Both arrive through `className`. That is
 * also why the `elite` variant does not set `relative` for its gradient
 * edge: `stroke-gradient-elite` needs a positioned box, and a call site that
 * makes it `absolute` must not have that fought by a `relative` from here.
 * One that places it in flow passes `relative` itself.
 *
 * NOT INTERACTIVE, and so a `<p>`, not a button: it states a fact. The glyph
 * is decorative; the label is the whole of what it says.
 */
export function Badge(
  props: {
    className?: string
    children: React.ReactNode
  } & (
    | { variant: 'icon'; icon: IconComponent }
    | { variant: 'elite' }
    | { variant: 'text' }
  ),
) {
  const { variant, className, children } = props
  return (
    <p
      data-slot="badge"
      data-variant={variant}
      className={cn(
        'flex shrink-0 items-center rounded-full whitespace-nowrap',
        variant === 'icon' && 'h-8 gap-1.5 bg-card pr-4 pl-3 text-body-md text-primary',
        variant === 'elite' &&
          'h-8 gap-1 stroke-gradient-elite bg-card/90 pr-3 pl-2 text-body-md text-emphasis',
        variant === 'text' &&
          'self-start bg-primary px-2.5 py-1 text-body-xs font-semibold text-primary-foreground',
        className,
      )}
    >
      {props.variant === 'icon' ? (
        <props.icon className="size-4.5 shrink-0" aria-hidden="true" />
      ) : null}
      {variant === 'elite' ? <EliteIcon className="size-5 shrink-0" aria-hidden="true" /> : null}
      {children}
    </p>
  )
}
