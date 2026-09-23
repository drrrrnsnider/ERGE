import { useState } from 'react'
import { Event } from '@/components/icons'
import { Calendar, type DateRange } from '@/components/patterns/calendar'
import { FieldAction } from '@/components/patterns/field-action'
import { FieldPill } from '@/components/patterns/field-pill'
import { PickerSurface } from '@/components/patterns/picker-surface'

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
 * WHERE THE CALENDAR APPEARS is `PickerSurface`'s problem — a sheet on a
 * phone, a popover on a desktop. That started here and moved out the moment
 * the filter chips needed the same thing, which is the 80%-the-same rule
 * working as intended. `Done` is passed because a range takes two taps, so
 * the sheet cannot close on selection the way a single-choice one can.
 */

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

  return (
    <FieldPill size="Sm" leading={<Event />} action={shortcut}>
      <PickerSurface
        trigger={trigger}
        title="Choose dates"
        open={open}
        onOpenChange={setOpen}
        doneLabel="Done"
      >
        <div className="flex justify-center">
          <Calendar value={value} onChange={onChange} />
        </div>
      </PickerSurface>
    </FieldPill>
  )
}
