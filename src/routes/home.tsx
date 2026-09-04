import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Placeholder screen. It exists to prove the whole chain is wired up:
 * Figma token -> theme bridge -> Tailwind utility -> shadcn component,
 * plus routing, icons, and the dark variant.
 *
 * Delete this the moment there is a real first screen to build.
 */
export function HomeRoute() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <div className="flex items-center gap-3">
        <Compass className="size-8 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight">ERGE</h1>
      </div>

      <p className="text-muted-foreground">
        Scaffold is live. Flights, hotels, restaurants, rideshare and events
        will land here as one itinerary.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Tab to the buttons to check the focus ring. The app is dark-only — the{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          dark
        </code>{' '}
        class on <code className="font-mono text-xs">&lt;html&gt;</code> is
        load-bearing, not a toggle, and colours come from the Figma export via{' '}
        <code className="font-mono text-xs">npm run tokens</code>.
      </p>
    </div>
  )
}
