import { Menu as BaseMenu } from '@base-ui/react/menu'
import { cn } from '@/lib/utils'

/**
 * The overflow menu — "•••" on a card or a title bar (Figma 230:8766).
 *
 * OURS, ON BASE UI, so it looks the same on the web, in the iOS build and in
 * the Android build (Darrin, 2026-10-06). Base UI's Menu brings the parts
 * that are easy to get wrong by hand: `role="menu"` and `menuitem`, arrow-key
 * movement between items, typeahead, Escape to close, focus returned to the
 * button that opened it, and the menu kept on screen near an edge. The
 * native iOS menu was the alternative and was turned down: Android would
 * draw something else and the web build nothing at all.
 *
 * THE MOCKUP IS iOS KIT, THE BUILD IS ERGE ROLES. The frame was drawn with
 * Apple's Liquid Glass component, whose fills, 17pt labels, 34px corners and
 * iOS red are not our variables. Each is mapped to the nearest existing role
 * instead (Darrin approved the mapping, 2026-10-06):
 *
 *   glass surface      Surface/Elevated (`popover`) at 90% with a backdrop
 *                      blur, the Border/Subtle Focus hairline the floating
 *                      buttons wear, Radius/lg and `shadow-card`
 *   17pt labels        Body/Large, 16
 *   copper label       Text/Secondary (`text-emphasis`) — "Build Trip"
 *   separators         Border/Subtle
 *   iOS red            `destructive` (Feedback/Error), asserted at 4.5:1 on
 *                      Surface/Elevated in tokens.test.ts
 *   23% black dim      Surface/Base at 25%
 *
 * TARGETS. The frame's rows are 36px. On a coarse pointer they grow to 44,
 * like every other control — these are real actions, "Delete from Library"
 * among them, so none of them opts out. The theme's 44px rule does not
 * reach `role="menuitem"`, so it is set here explicitly.
 */

export function Menu({
  trigger,
  label,
  children,
  align = 'end',
}: {
  /** The button that opens it. Base UI wires up aria-haspopup and the rest. */
  trigger: React.ReactElement
  /** Names the menu for a screen reader — "Options for Dinners & Views". */
  label: string
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
}) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        {/* The dim behind it, as in the frame. A fade only, so it runs
          * under reduced motion too. */}
        <BaseMenu.Backdrop className="fixed inset-0 bg-background/25 transition-opacity duration-fast ease-enter data-closed:opacity-0 data-closed:ease-exit data-starting-style:opacity-0" />
        <BaseMenu.Positioner side="bottom" align={align} sideOffset={8} collisionPadding={16}>
          <BaseMenu.Popup
            aria-label={label}
            className={cn(
              'w-62.5 rounded-lg border border-border-subtle-focus bg-popover/90 px-4 py-2.5 shadow-card backdrop-blur-md',
              'outline-none transition-opacity duration-fast ease-enter',
              'data-closed:pointer-events-none data-closed:opacity-0 data-closed:ease-exit data-starting-style:opacity-0',
            )}
          >
            {children}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  )
}

export function MenuItem({
  icon: Icon,
  tone = 'default',
  onClick,
  children,
}: {
  icon?: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement
  /** `emphasis` is the copper "Build Trip"; `destructive` is a removal that
   * cannot be undone from the menu itself — "Delete from Library". */
  tone?: 'default' | 'emphasis' | 'destructive'
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <BaseMenu.Item
      onClick={onClick}
      data-tone={tone}
      className={cn(
        'flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-body-lg outline-none select-none',
        'pointer-coarse:min-h-11',
        /* Where the keyboard or a pointer is — Base UI moves
         * `data-highlighted` between items. Surface/Card is a shade darker
         * than the menu's Elevated, so the row reads as pressed in. Also
         * what keyboard focus looks like here: Base UI keeps real focus on
         * the item, and this is its indicator. */
        'data-highlighted:bg-card',
        tone === 'default' && 'text-foreground',
        tone === 'emphasis' && 'text-emphasis',
        tone === 'destructive' && 'text-destructive',
      )}
    >
      {Icon ? <Icon className="size-5 shrink-0" aria-hidden="true" /> : null}
      <span className="min-w-0 flex-1 truncate py-2">{children}</span>
    </BaseMenu.Item>
  )
}

/** A rule between groups — 10px of space either side, as drawn. */
export function MenuSeparator() {
  return <BaseMenu.Separator className="mx-2 my-2.5 h-px bg-border-subtle" />
}
