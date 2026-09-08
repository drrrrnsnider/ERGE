import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiError } from '@/lib/api/schemas/error'
import { cn } from '@/lib/utils'

/**
 * "This part could not load."
 *
 * One of the four data states every screen owes. Renders the normalised
 * ApiError — the ONLY error shape components see — so it never has to
 * inspect an `unknown`.
 *
 * Scoped to the thing that failed, not the page. On Explore one rail failing
 * while the rest render is normal (api-contract.md, "Partial failure is an
 * operating condition"). So this is a block that sits where the content
 * would have been, the same size a skeleton or an empty state would take.
 *
 * `role="status"`, not `role="alert"`. An alert interrupts whatever the
 * screen reader is saying. A section that failed to load is worth knowing
 * about but is not urgent, and three rails failing at once as three alerts
 * would be hostile. Polite announcement, once, when it appears.
 *
 * Retry is offered only when the error says it is retryable. Offering a
 * retry for a `not_found` teaches users that the button does nothing.
 */
export function ErrorState({
  error,
  onRetry,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  error: ApiError
  onRetry?: () => void
}) {
  return (
    <div
      role="status"
      data-slot="error-state"
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl bg-card px-4 py-8 text-center',
        className,
      )}
      {...props}
    >
      <AlertCircle
        className="size-8 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="font-medium text-card-foreground">{error.message}</p>
      {error.retryable && onRetry ? (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      ) : null}
    </div>
  )
}
