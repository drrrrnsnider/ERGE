import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * "There is nothing here, and that is fine."
 *
 * One of the four data states every screen owes (interaction-spec.md).
 * Established once so no screen invents its own centred-grey-text version.
 *
 * Empty is a DESIGNED state, not an absence. The cold-start Explore has an
 * empty "Ideas for Your Trip" because a new user has no trips — the copy
 * should say what to do about that, not just that nothing is there. Hence
 * `action` is a slot, not an afterthought.
 *
 * Not `role="status"`: an empty state that is present on first render is
 * content, not a change. If a list empties in response to the user's own
 * action, the thing that emptied it is what should announce.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl bg-card px-4 py-8 text-center',
        className,
      )}
      {...props}
    >
      {Icon ? (
        <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
      ) : null}
      <p className="font-medium text-card-foreground">{title}</p>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
