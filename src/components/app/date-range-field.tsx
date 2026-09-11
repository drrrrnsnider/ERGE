import { Drawer } from '@base-ui/react/drawer'
import { Popover } from '@base-ui/react/popover'
import { useState } from 'react'
import { Event } from '@/components/icons'
import { Calendar, type DateRange } from '@/components/patterns/calendar'
import { FieldAction } from '@/components/patterns/field-action'
import { FieldPill } from '@/components/patterns/field-pill'
import { Button } from '@/components/patterns/button'
import { useMediaQuery } from '@/lib/use-media-query'

/**
 * The date row in the search takeover: a pill that opens a range calendar.
 *
 * WHY THIS IS A COMPONENT AND NOT MARKUP IN THE ROUTE
 * ---------------------------------------------------
 * `FieldPill` is the BOX — the ring, its focus-within colour, the sizes, the
 * glyph sizing, the stretched content area. Five different things sit in one
 * and want exactly that. It is a real primitive, not a Figma grouping, and it
 * should not be split.
 *
 * But this row is not "a pill with text in it". It is a date range picker
 * that happens to wear a pill: it owns a `DateRange`, a trigger, a calendar,
 * the formatting of a range into a few words, and a "Today" shortcut. None of
 * that belongs in a box component, and it should not be loose in the route
 * either — which is where it started, as a `useState<string | null>` holding
 * the literal word "Today".
 *
 * So the split runs between BEHAVIOUR and BOX, not through the box. Same
 * shape as `BudgetRange`, which owns budget behaviour and uses RangeSlider
 * and FieldSimpleCompact for its chrome.
 *
 * TWO SURFACES, ONE PICKER
 * ------------------------
 * A sheet from the bottom on a phone, a popover under the row on a desktop.
 * Both are Base UI, so the focus trap, the escape key, the outside press and
 * the scroll lock are the library's rather than ours.
 *
 * It is a real branch rather than one surface shown two ways, because a
 * bottom sheet and an anchored popover are different components with
 * different behaviour — and rendering both and hiding one with CSS would
 * mean two copies of the open state and two focus traps in the document.
 *
 * The `Done` button is not decoration on the sheet. A range needs two taps,
 * so there is a moment where you have picked a start and nothing else; the
 * sheet cannot close on selection the way a single-date picker would, and
 * something has to say when you are finished.
 */

/* Deliberately not `pointer: coarse`. That asks what you are touching the
 * screen with; this asks how much room there is to put a calendar. A tablet
 * with a stylus wants the popover. */
const DESKTOP = '(min-width: 768px)'

const short = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/**
 * What the row says. "Today" survives as a word rather than becoming a date,
 * because it is what the shortcut promised and seeing it turn into "Mar 3"
 * reads as the app having done something slightly different from what was
 * asked.
 */
export function formatRange(range: DateRange | undefined): string | null {
  if (!range?.from) return null
  const today = new Date()
  const endsSameDay = !range.to || isSameDay(range.from, range.to)
  if (endsSameDay) {
    return isSameDay(range.from, today) ? 'Today' : short.format(range.from)
  }
  return `${short.format(range.from)} – ${short.format(range.to as Date)}`
}

/** Midnight today, as a one-day range. */
function todayRange(): DateRange {
  const now = new Date()
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return { from: day, to: day }
}

export function DateRangeField({
  value,
  onChange,
}: {
  value: DateRange | undefined
  onChange: (next: DateRange | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const desktop = useMediaQuery(DESKTOP)

  const label = formatRange(value)
  const trigger = (
    <FieldAction
      name={label === null ? 'Set dates' : 'Change dates'}
      label={label ?? 'Set dates'}
      tone={label === null ? 'muted' : 'subject'}
    />
  )

  /* Only offered while nothing is chosen. Leaving it up afterwards made the
   * row read "Today … Today" — at once a duplicate and a control that
   * appeared to do nothing. */
  const shortcut =
    label === null ? (
      <FieldAction
        name="Set dates to today"
        label="Today"
        onClick={() => onChange(todayRange())}
      />
    ) : undefined

  const calendar = <Calendar value={value} onChange={onChange} />

  if (desktop) {
    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <FieldPill
          size="Sm"
          leading={<Event />}
          action={shortcut}
        >
          <Popover.Trigger render={trigger} />
        </FieldPill>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="start" sideOffset={8}>
            <Popover.Popup className="rounded-lg border border-border bg-card p-4 shadow-lift">
              {calendar}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    )
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <FieldPill size="Sm" leading={<Event />} action={shortcut}>
        <Drawer.Trigger render={trigger} />
      </FieldPill>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 bg-background/60" />
        {/* `pb` clears the home indicator; without it the Done button sits
          * under it on a phone with no bezel. */}
        <Drawer.Popup className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 rounded-t-lg border-t border-border bg-card px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {/* The grab bar is ours. `Drawer.Handle` is Base UI's IMPERATIVE
            * handle — an object for opening the drawer from elsewhere — not
            * the thing you drag, which the library leaves to the author. */}
          <div aria-hidden="true" className="h-1 w-10 shrink-0 rounded-full bg-border" />
          <Drawer.Title className="sr-only">Choose dates</Drawer.Title>
          <Drawer.Viewport className="w-full overflow-y-auto">
            <div className="flex justify-center">{calendar}</div>
          </Drawer.Viewport>
          <Drawer.Close
            render={<Button label="Done" size="Md" className="w-full" />}
          />
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
