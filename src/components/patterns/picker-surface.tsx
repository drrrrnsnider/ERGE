import { Drawer } from '@base-ui/react/drawer'
import { Popover } from '@base-ui/react/popover'
import { Button } from '@/components/patterns/button'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

/**
 * The surface a small chooser opens into: a sheet from the bottom on a
 * phone, a popover under the control on a desktop.
 *
 * Extracted from `DateRangeField`, which had it inline, the moment the
 * filter chips needed the same thing. It is the 80%-the-same rule in
 * CLAUDE.md doing its job: what would have been copied is not the styling
 * but the branch itself, plus the reasons it is a branch.
 *
 * WHY A BRANCH AND NOT ONE SURFACE RESTYLED. A bottom sheet and an anchored
 * popover are different components with different behaviour, and rendering
 * both while hiding one with CSS would put two copies of the open state and
 * two focus traps in the document. Both come from Base UI, so the focus
 * trap, the escape key, the outside press and the scroll lock are the
 * library's rather than ours.
 *
 * The media query asks how much ROOM there is, not what you are touching
 * with — a tablet with a stylus still wants the popover.
 *
 * `doneLabel` renders a closing button on the sheet only. It is not
 * decoration where it appears: a range takes two taps, so there is a moment
 * with a start and no end, and the sheet cannot close on selection the way a
 * single-choice one could. A popover needs none, because dismissing it is
 * already obvious and the trigger is still visible.
 */

const DESKTOP = '(min-width: 768px)'

export function PickerSurface({
  trigger,
  title,
  open,
  onOpenChange,
  doneLabel,
  className,
  children,
}: {
  /** The control that opens it. Cloned by Base UI, so it must take props. */
  trigger: React.ReactElement
  /** Names the sheet for a screen reader. Not drawn. */
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Renders a closing button on the sheet. Omit where choosing closes it. */
  doneLabel?: string
  className?: string
  children: React.ReactNode
}) {
  const desktop = useMediaQuery(DESKTOP)

  if (desktop) {
    return (
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger render={trigger} />
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="start" sideOffset={8}>
            <Popover.Popup
              className={cn(
                'rounded-lg border border-border bg-card p-4 shadow-lift',
                /* Base UI marks a dismissed surface `data-closed` and leaves
                 * the exit to the author. Style nothing and it stays on
                 * screen, closed — which is exactly what happened. */
                'transition-opacity data-closed:pointer-events-none data-closed:opacity-0',
                'motion-safe:duration-150',
                className,
              )}
            >
              <Popover.Title className="sr-only">{title}</Popover.Title>
              {children}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    )
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Trigger render={trigger} />
      <Drawer.Portal>
        <Drawer.Backdrop
          className={cn(
            'fixed inset-0 bg-background/60',
            'transition-opacity data-closed:opacity-0 motion-safe:duration-200',
          )}
        />
        {/* VIEWPORT OUTSIDE, POPUP INSIDE — this nesting is load-bearing and
          * was the other way round until Base UI said so in a console
          * warning. Getting it wrong costs swipe-to-dismiss and touch scroll
          * locking, neither of which shows up on a desktop or in a test that
          * only checks the sheet opened, so it had been silently broken on
          * phones since the date picker was built.
          *
          * The height cap lives here rather than on the popup because this
          * is the scroll container: a long sheet scrolls inside the screen
          * instead of running off the bottom of it. */}
        <Drawer.Viewport className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto data-closed:pointer-events-none">
          {/* `pb` clears the home indicator; without it the closing button
            * sits under it on a phone with no bezel. */}
          <Drawer.Popup
            className={cn(
              'flex flex-col items-center gap-3',
              'rounded-t-lg border-t border-border bg-card px-4 pt-2',
              'pb-[calc(1rem+env(safe-area-inset-bottom))]',
              /* Slides out of the way when dismissed. Without this it sat
               * on screen marked `data-closed` and still visible: Base UI
               * sets the state and leaves the exit to the author, so a sheet
               * with no closed styling never goes away.
               *
               * With motion reduced it simply jumps off-screen, which is the
               * right outcome — the point is that it leaves, not that it
               * slides. */
              'transition-transform data-closed:translate-y-full',
              'motion-safe:duration-200',
              className,
            )}
          >
            {/* The grab bar is ours. `Drawer.Handle` is Base UI's IMPERATIVE
              * handle — an object for opening the drawer from elsewhere —
              * not the thing you drag, which the library leaves to the
              * author. */}
            <div
              aria-hidden="true"
              className="h-1 w-10 shrink-0 rounded-full bg-border"
            />
            <Drawer.Title className="sr-only">{title}</Drawer.Title>
            {children}
            {doneLabel === undefined ? null : (
              <Drawer.Close
                render={
                  <Button label={doneLabel} size="Md" className="w-full" />
                }
              />
            )}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
