import { cn } from '@/lib/utils'

/**
 * `Input Field Special` — the pill that holds a search field or a filter row.
 *
 * Figma 168:2541. Two sizes, and three slots:
 *
 *   leading   the 30px round box on the left
 *   children  the content between the slots
 *   action    whatever sits on the right
 *
 *   Md  48px tall, 22px glyphs, gap 8, pr 14   the search field
 *   Sm  32px tall, 20px glyphs, gap 4, pr 12   a filter row
 *
 * NOT the same thing as `Input` in this folder, despite the names. `Input` is
 * the labelled form control from its own component set — label above, helper
 * beneath, error state. This is a bare pill with no label of its own, used
 * where the placeholder or the row's own text carries the meaning.
 *
 * SLOTS RATHER THAN PROPS FOR THE CONTENT, because what goes in them is not
 * one kind of thing. Across the screens that use it, `leading` is sometimes a
 * decorative glyph and sometimes a back button, and `children` is sometimes a
 * real <input> and sometimes static text. Encoding that as `icon` + `text`
 * props would mean a boolean for "is the icon pressable" and another for "is
 * the text editable", which is two lies waiting to be told. The component
 * owns the box and the sizing; the caller owns what is in it.
 *
 * The glyph sizing is a descendant rule rather than a prop for the same
 * reason: `<Search />` and `<button><ArrowBack /></button>` both end up the
 * right size without the component needing to know which it was handed.
 *
 * Glyphs are Action/Primary, checked against the exported assets rather than
 * assumed — the search icon in the design is copper, not the muted grey an
 * earlier hand-rolled copy of this pill used.
 */
export function InputFieldSpecial({
  size = 'Md',
  leading,
  action,
  className,
  children,
}: {
  size?: 'Md' | 'Sm'
  /** The left box. A glyph, or a button wrapping one. */
  leading?: React.ReactNode
  /** The right-hand element. A glyph, a button, or a text action. */
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const md = size === 'Md'
  return (
    <div
      data-slot="input-field"
      data-size={size}
      className={cn(
        'flex w-full min-w-0 items-center rounded-full border border-border bg-card pl-2',
        md ? 'h-12 gap-2 pr-3.5' : 'h-8 gap-1 pr-3',
        /* The design's focus treatment: the ring turns Border/Focus while the
         * field is focused. theme.css draws the focus ring for this pill too,
         * keyed off data-slot — see its comment on why that lives there. */
        'focus-within:border-ring',
        className,
      )}
    >
      {leading !== undefined ? (
        <span
          className={cn(
            'grid size-[30px] shrink-0 place-items-center overflow-clip rounded-full text-primary',
            md ? '[&_svg]:size-[22px]' : '[&_svg]:size-5',
          )}
        >
          {leading}
        </span>
      ) : null}

      {/* `min-w-0` so a long value shrinks instead of pushing the action out
        * of the pill — a flex item defaults to its content width.
        *
        * `self-stretch` so this box is as tall as the pill. The pill centres
        * its children, which would otherwise leave this only as tall as its
        * text — and an <input> inside it asking for `h-full` would resolve
        * against an indefinite height and collapse to its line box. That is
        * exactly what happened when this markup moved out of the layout and
        * in here: the search field became 18px tall and the 24px target test
        * caught it. */}
      <div
        className={cn(
          'flex min-w-0 flex-1 items-center self-stretch overflow-clip',
          md ? 'gap-2' : 'gap-1',
        )}
      >
        {children}
      </div>

      {action !== undefined ? (
        <span
          className={cn(
            'shrink-0 text-primary',
            md ? '[&_svg]:size-[22px]' : '[&_svg]:size-5',
          )}
        >
          {action}
        </span>
      ) : null}
    </div>
  )
}
