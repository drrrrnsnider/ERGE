import { Link } from 'react-router'
import type { ReactElement, SVGProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * An inline text button that lives inside a `FieldPill`.
 *
 * WHY THIS IS NOT A COPY OF THE FIGMA COMPONENT
 * ---------------------------------------------
 * Figma has `Input Text Action` (168:2424), which is a component wrapping a
 * single text node — its default content is the word "Today". It exists
 * because Figma cannot express "this pill optionally carries a second,
 * tappable run of text": the only way to get a swappable, overridable,
 * toggleable string is to make it an instance. It is a file-structure
 * workaround, not a description of the thing.
 *
 * Mirroring it in code would have produced a component that renders text,
 * and text is not what it is. Look at the results bar (168:2519):
 *
 *     ←   Date Night   Current Location                              ✦
 *
 * That is FOUR independent controls, not "an icon, some text, an action and
 * an icon". Back, the query, the location scope, and the concierge handoff
 * are each separately tappable and go to different places — the same as the
 * Yelp header this is modelled on, where the search term and the location
 * are two different fields you can edit one without the other.
 *
 * So the honest unit is a BUTTON, and there are two of them in that bar. This
 * component is that button. Static text needs no component at all — put a
 * `<span>` in the pill's children.
 *
 * TONE
 * ----
 *   subject  Text/Primary, SemiBold   the thing being searched for
 *   action   Action/Primary, Regular  the scope or filter applied to it
 *   muted    Text/Muted, Regular      the same slot with nothing in it yet
 *   scope    Text/Secondary, Regular  the location a RESULT set is scoped to
 *
 * `scope` is champagne where `action` is copper, and the difference is the
 * results bar's own — sampled from the rendered design (2340:3681), where
 * "Current Location" renders as Text/Secondary. The takeover's location row and "Today"
 * keep `action`; recolouring that tone would have changed both of them.
 *
 * `muted` is the placeholder case — "Add location" rather than a location.
 * It is still a button, because the whole point of it is that pressing it is
 * how you fill it in.
 *
 * Both are 14px. The weight changes with the colour, exactly as it does on
 * `Button` — Subtle is copper at Regular, Primary is inverse at SemiBold.
 * Checked against the rendered design rather than the bindings:
 * `get_variable_defs` reports only `Action/Medium` for this node, because the
 * Regular run's style is not variable-bound, and taking that at face value
 * would have made both runs SemiBold.
 *
 * `subject` truncates and `action` does not, so a long query gives way to the
 * location rather than pushing it out of the pill. The query is the part you
 * can still read from context; the location is not.
 *
 * ACCESSIBLE NAMES ARE REQUIRED, and composed rather than passed whole.
 * "Current Location, button" does not say what pressing it does, and a
 * caller handed one free-text `aria-label` prop eventually writes one that
 * drops the visible words — which breaks WCAG 2.5.3 Label in Name and, with
 * it, voice control, since "tap Current Location" then matches nothing. So
 * `name` is the verb phrase only, and the component builds
 * "Change location: Current Location" itself. The visible text stays real
 * text content, which is what voice control and translation both want.
 */
export function FieldAction({
  label,
  name,
  tone = 'action',
  to,
  onClick,
  className,
  ...props
}: Omit<React.ComponentProps<'button'>, 'name'> & {
  /** The words you see. */
  label: string
  /**
   * What pressing it does, as a verb phrase — "Change location", "Edit
   * search". Prefixed to `label` to form the accessible name, so a screen
   * reader hears "Change location: Current Location".
   */
  name: string
  tone?: 'subject' | 'action' | 'muted' | 'scope'
  /** Navigates instead of acting. */
  to?: string
}) {
  const subject = tone === 'subject'

  /* No `data-target="compact"`. This is how you get back to the search you
   * are looking at, which CLAUDE.md puts firmly outside what may opt out of
   * the 44px floor. It sits in a 48px pill, so the height costs nothing; a
   * short label like "Today" widens to 44px on a phone, which is the point. */
  const shape = cn(
    'inline-flex h-full items-center bg-transparent text-body-md whitespace-nowrap',
    subject
      ? 'min-w-0 truncate font-semibold text-foreground'
      : 'shrink-0 font-normal',
    tone === 'action' && 'text-primary',
    tone === 'muted' && 'text-muted-foreground',
    tone === 'scope' && 'text-emphasis',
    className,
  )

  const content = (
    <>
      {/* Reads before the visible words, so the name is a sentence rather
        * than a label with a verb stuck on the end. */}
      <span className="sr-only">{name}: </span>
      {label}
    </>
  )

  if (to) {
    return (
      <Link to={to} data-slot="field-action" data-tone={tone} className={shape}>
        {content}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      data-slot="field-action"
      data-tone={tone}
      className={shape}
      {...props}
    >
      {content}
    </button>
  )
}

/**
 * A bare glyph control inside a `FieldPill` — the back arrow, the concierge
 * star. The glyph is what you see; there is no ring, fill or circle, which is
 * what the pill draws (Figma 168:2519).
 *
 * THE TAP AREA IS BIGGER THAN THE DRAWING, AND DOES NOT MOVE IT. The box in
 * the layout is only as big as the glyph, so the glyph lands exactly where
 * the design puts it — flush against the pill's padding. The control itself
 * is a 44px circle absolutely centred on that box, so a thumb gets the full
 * coarse-pointer target without the glyph being pushed 11px inward to make
 * room for it. That push is what the ringed ButtonIcon was doing here.
 *
 * It overhangs its slot on purpose, so whatever holds it must not clip. That
 * is why FieldPill's leading box no longer carries `overflow-clip`: it was
 * cutting the back button's 44px down to the 30px box it sat in.
 *
 * `label` is the whole accessible name. Unlike FieldAction there are no
 * visible words to keep in it — a glyph has none.
 */
export function FieldIconAction({
  label,
  icon: Icon,
  to,
  onClick,
  className,
}: {
  label: string
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement
  /** Navigates instead of acting. Mutually exclusive with onClick. */
  to?: string
  onClick?: () => void
  /** On the footprint, so a colour set here is inherited by the glyph. */
  className?: string
}) {
  const hit =
    'absolute top-1/2 left-1/2 grid size-11 -translate-1/2 place-items-center rounded-full'
  const glyph = <Icon aria-hidden="true" />
  return (
    <span
      data-slot="field-icon-action"
      className={cn('relative block size-[22px] shrink-0', className)}
    >
      {to ? (
        <Link to={to} aria-label={label} className={hit}>
          {glyph}
        </Link>
      ) : (
        <button type="button" onClick={onClick} aria-label={label} className={hit}>
          {glyph}
        </button>
      )}
    </span>
  )
}
