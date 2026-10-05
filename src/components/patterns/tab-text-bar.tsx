import { cn } from '@/lib/utils'

/**
 * `Tab Text Bar` — the category row across the top of the results sheet.
 *
 * Figma 177:7050, items from `.Tab Text` (177:6938). A horizontally
 * scrolling row of 48px items: a 14px glyph 4px from its label, 6px of
 * padding either side, and a 1px square rule under the selected one that
 * runs the full padded width — not just under the words. Selected is Action/Inverse
 * and the rest are Text/Muted; the type is Heading/H5 throughout, so only the
 * colour and the rule change.
 *
 * NOT `role="tablist"`, despite the name. ARIA tabs switch between panels,
 * and the pattern brings a roving tabindex and `aria-controls` with it. These
 * do not switch panels — they filter one list that the chip row below filters
 * too, so "which tab is showing" is not a thing a screen reader could be told
 * truthfully. A group of pressable buttons says what is actually happening:
 * several filters, any of which changes the same list.
 *
 * NOT `RailScroller` either, even though it also scrolls sideways. That one
 * is `snap-mandatory`, which is the substance of a card rail — you want to
 * land on a card — and is wrong for a row of words, where snapping fights
 * you. Sharing them would mean a flag that turns off the only interesting
 * thing the other one does.
 */

type IconComponent = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

export type TabTextItem = {
  /** Stable key, and what the caller gets back on select. */
  id: string
  label: string
  /** Omitted for "All", which has none in the design. */
  icon?: IconComponent
}

export function TabTextBar({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: readonly TabTextItem[]
  value: string
  onChange: (id: string) => void
  /** Names the group, e.g. "Category". */
  label: string
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="tab-text-bar"
      className={cn(
        /* No snap — see the note above. `px-4` so the first and last items
         * clear the edge, and `scroll-px-4` so a keyboard-focused one is not
         * left flush against it. */
        'flex gap-2.5 overflow-x-auto px-4 scroll-px-4 [scrollbar-width:none]',
        className,
      )}
    >
      {items.map((item) => {
        const on = item.id === value
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            /* `aria-pressed` rather than `aria-selected`: selected belongs to
             * tabs and options, and this is neither. */
            aria-pressed={on}
            onClick={() => onChange(item.id)}
            data-slot="tab-text"
            /* A category is how you narrow the whole screen, so it keeps the
             * full 44px target — `data-target="compact"` is for the chips
             * below, which are secondary to it. */
            className={cn(
              'flex h-12 shrink-0 items-stretch justify-center whitespace-nowrap',
              /* Action/Inverse when selected, as the design binds it — not
               * Text/Primary, which is the same colour today but a different
               * decision. The glyph and the rule are currentColor, so all
               * three follow. */
              on ? 'text-action-inverse' : 'text-muted-foreground',
            )}
          >
            {/* THE RULE IS ON THIS SPAN, NOT THE BUTTON. On a phone the
              * coarse-pointer floor widens a short item like "All" to 44px,
              * and a rule on the button would stretch with it — 44px of
              * underline where the design draws 31. Here the button is the
              * target and this is the drawing, so each gets its own width.
              *
              * The border is always there and only coloured when selected,
              * so the labels do not shift by 1px as you move between them. */}
            <span
              className={cn(
                'flex items-center gap-1 border-b px-1.5 text-h5 font-medium',
                on ? 'border-current' : 'border-transparent',
              )}
            >
              {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
