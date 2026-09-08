import { Construction } from 'lucide-react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/patterns/empty-state'
import { Button } from '@/components/ui/button'

/**
 * Where links land before their screen exists.
 *
 * A working prototype has to let a link go somewhere honest. This shows what
 * the link was TRYING to do — the route, its params, and any active filters —
 * so "Popular Nearby" visibly arrives at search with `near=me` set, even
 * though search itself is not built. When the real screen lands, it replaces
 * this at the same path and every existing link keeps working.
 */
export function NotBuiltRoute() {
  const { pathname } = useLocation()
  const params = useParams()
  const [search] = useSearchParams()

  const paramEntries = Object.entries(params).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  )
  const filterEntries = [...search.entries()]

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <EmptyState
        icon={Construction}
        title="Not built yet"
        description={`${pathname} is on the list.`}
        action={
          <Button render={<Link to="/" />} variant="outline">
            Back to Explore
          </Button>
        }
      />
      {paramEntries.length > 0 || filterEntries.length > 0 ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {paramEntries.map(([k, v]) => (
            <Row key={`p-${k}`} label={k} value={v} />
          ))}
          {filterEntries.map(([k, v]) => (
            <Row key={`f-${k}`} label={`filter: ${k}`} value={v} />
          ))}
        </dl>
      ) : null}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-foreground">{value}</dd>
    </>
  )
}
