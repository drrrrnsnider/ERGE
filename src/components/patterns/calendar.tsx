import { DayPicker, type DateRange } from 'react-day-picker'
import { ArrowForwardIos } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * A range calendar, on top of `react-day-picker`.
 *
 * WHY THIS IS OURS AND NOT THE VENDORED shadcn CALENDAR
 * -----------------------------------------------------
 * `npx shadcn@latest add calendar` was run, and its output was backed out for
 * three reasons — worth writing down, because the obvious move is to run it
 * again one day:
 *
 *  1. It imports `cn` from an npm package of that name, not from
 *     `@/lib/utils`. Ours is extended to know our type scale; the package's
 *     is not. Using it would silently drop `text-body-md` and friends
 *     wherever a colour appeared in the same call — exactly the bug that was
 *     found and fixed in this codebase days ago, reintroduced inside a
 *     component nobody would think to look in.
 *  2. It imports `lucide-react`, which is not installed and is not going to
 *     be: CLAUDE.md picks Material Symbols, vendored as path data. The file
 *     did not compile as delivered.
 *  3. It pulls in `ui/button.tsx`, which the ui/ README explicitly says is
 *     not vendored here, and for a reason that still holds.
 *
 * Composing the library directly is also what `range-slider.tsx` already does
 * with Base UI's Slider, so this is the established shape rather than a new
 * one. `react-day-picker` is the real engine either way — "the shadcn date
 * picker" is a styled wrapper around it.
 *
 * EVERY COLOUR IS A ROLE. The library ships its own stylesheet, which is not
 * imported; all of the appearance is these utilities, so the calendar tracks
 * the tokens like everything else.
 */

export type { DateRange }

export function Calendar({
  value,
  onChange,
  className,
}: {
  value: DateRange | undefined
  onChange: (next: DateRange | undefined) => void
  className?: string
}) {
  return (
    <DayPicker
      mode="range"
      selected={value}
      onSelect={onChange}
      /* Past dates cannot be booked, so they cannot be picked. `today` rather
       * than a fixed date, so this stays true tomorrow. */
      disabled={{ before: new Date() }}
      showOutsideDays
      className={cn('w-fit text-body-md text-foreground', className)}
      /* One chevron drawing, rotated for the previous month — the icon set
       * has a forward chevron and no backward one, and a 180° rotation is
       * the same glyph rather than a second asset to keep in step. */
      components={{
        Chevron: ({ orientation, className: chevronClass, ...props }) => (
          <ArrowForwardIos
            {...props}
            aria-hidden="true"
            className={cn(
              'size-4',
              orientation === 'left' && 'rotate-180',
              chevronClass,
            )}
          />
        ),
      }}
      classNames={{
        /* `relative` because the nav is absolutely positioned and this is
         * its PARENT — measured, not assumed. Positioning the caption
         * instead left the nav resolving against whatever was holding the
         * calendar, so in the sheet the chevrons flew out to the screen
         * edges: root and grid were both 280px while the nav was 375. */
        months: 'relative flex flex-col gap-4',
        month: 'flex flex-col gap-3',
        /* The caption is centred with the two nav buttons pinned to the
         * edges of the grid, so the month name does not shift as its length
         * changes. */
        month_caption: 'flex h-8 items-center justify-center',
        caption_label: 'text-h4 font-medium text-foreground',
        nav: 'absolute inset-x-0 top-0 flex h-8 items-center justify-between',
        button_previous:
          'grid size-8 place-items-center rounded-full text-primary disabled:opacity-30',
        button_next:
          'grid size-8 place-items-center rounded-full text-primary disabled:opacity-30',
        /* No `w-full`. The grid is seven 40px cells and should size to
         * that; stretching it made the caption wider than the days, which
         * pushed the nav chevrons out to the edges of whatever was holding
         * the calendar. */
        month_grid: 'border-collapse',
        weekdays: 'flex',
        weekday: 'w-10 text-body-xs font-normal text-muted-foreground',
        week: 'mt-1 flex',
        /* The day CELL carries the range background so adjacent days join up
         * with no gaps; the BUTTON inside carries the round selected shape.
         * Splitting it that way is what makes a continuous bar possible. */
        day: 'size-10 p-0',
        day_button: cn(
          'size-10 rounded-full text-body-md',
          'hover:bg-card focus-visible:relative focus-visible:z-10',
          'disabled:pointer-events-none disabled:text-muted-foreground disabled:opacity-40',
        ),
        today: 'font-semibold text-primary',
        outside: 'text-muted-foreground opacity-40',
        disabled: 'text-muted-foreground opacity-40',
        hidden: 'invisible',

        /* THE RANGE BAND. A flat copper wash on the CELL, so consecutive
         * days meet with no seam, and the round filled pill on the BUTTON at
         * each end. `bg-radial-card` was wrong here — it is a chip's glow,
         * centred and falling off, so on a 40px square it read as a dark box
         * rather than a continuous band.
         *
         * `[&_button]:` reaches the day button from the cell, which is where
         * the range state lands. */
        range_start:
          'rounded-l-full bg-primary/15 [&_button]:bg-primary [&_button]:font-semibold [&_button]:text-primary-foreground',
        range_middle: 'bg-primary/15',
        range_end:
          'rounded-r-full bg-primary/15 [&_button]:bg-primary [&_button]:font-semibold [&_button]:text-primary-foreground',
        selected: '',
      }}
    />
  )
}
