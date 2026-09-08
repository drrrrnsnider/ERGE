import { Link } from 'react-router'
import type { Editorial } from '@/lib/api/schemas/editorial'

/**
 * The two promo cards on Explore. Not experiences — see the Editorial schema
 * for why. Both are a badge over a serif display headline; they differ in
 * what sits beneath it.
 *
 *   guides     a row of category entry points, each a link
 *   promotion  a caption and one call to action
 *
 * The category tiles are genuine targets, not inline links, so they are
 * sized as targets: the coarse-pointer rule deliberately skips `a`, and
 * these earn their 44px by their own minimum height instead.
 */
export function EditorialCard({ content }: { content: Editorial }) {
  return (
    <section
      aria-labelledby={`${content.id}-heading`}
      data-slot="editorial-card"
      data-kind={content.kind}
      className="mx-4 flex flex-col gap-4 rounded-xl bg-card p-4"
    >
      <p className="self-start rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
        {content.badge}
      </p>
      <h2
        id={`${content.id}-heading`}
        className="font-serif text-3xl leading-tight text-card-foreground"
      >
        {content.headline}
      </h2>

      {content.kind === 'guides' ? (
        <ul className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {content.entries.map((entry) => (
            <li key={entry.id} className="shrink-0 snap-start">
              <Link
                to={entry.href}
                className="flex min-h-24 w-28 items-end rounded-lg bg-muted p-3 text-sm font-medium text-foreground"
              >
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {content.caption}{' '}
          {/* Underlined ALWAYS, not on hover. This link sits inside a block of
            * text, and copper on muted grey is 1.23:1 — nowhere near the 3:1
            * that would let colour carry the distinction on its own. Without
            * a permanent underline it is invisible as a link to anyone who
            * cannot separate those two hues, and it fails SC 1.4.1. Caught by
            * axe's `link-in-text-block`, which is asserted in the e2e suite. */}
          <Link
            to={content.cta.href}
            className="text-primary underline underline-offset-4"
          >
            {content.cta.label}
          </Link>
        </p>
      )}
    </section>
  )
}
