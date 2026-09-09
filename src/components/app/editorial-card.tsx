import { Link } from 'react-router'
import type { Editorial } from '@/lib/api/schemas/editorial'

/**
 * The two promo cards. `Promo Tiles` and `Promo Text` in the design library.
 *
 * Not experiences — see the Editorial schema for why. Both are a badge over a
 * serif display headline; they differ entirely below that:
 *
 *   guides     `Promo Tiles`  — a copper-tinted gradient card holding a
 *                               horizontally scrollable row of 120px tiles,
 *                               each a link, one of which carries a photo.
 *   promotion  `Promo Text`   — a flat card with a copper border, a caption
 *                               and one call to action.
 *
 * Both are 370 wide inside a 402 frame, so they sit inset rather than
 * full-bleed.
 */

/** `Badge Text` — a copper pill with inverse text. */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <p className="self-start rounded-full bg-primary px-2.5 py-1 text-body-xs font-semibold text-primary-foreground">
      {children}
    </p>
  )
}

export function EditorialCard({ content }: { content: Editorial }) {
  const headingId = `${content.id}-heading`

  if (content.kind === 'guides') {
    return (
      <section
        aria-labelledby={headingId}
        data-slot="editorial-card"
        data-kind="guides"
        /* The gradient is a copper wash fading out over the card's own
         * surface — built from role tokens, not literal colours. */
        className="mx-4 flex flex-col gap-2.5 overflow-hidden rounded-lg stroke-gradient bg-card bg-[linear-gradient(180deg,color-mix(in_oklch,var(--primary)_10%,transparent)_0%,transparent_63%)] py-4 shadow-card"
      >
        <div className="flex flex-col gap-4 px-4">
          <Badge>{content.badge}</Badge>
          <h2 id={headingId} className="font-serif text-display-md leading-tight text-foreground">
            {content.headline}
          </h2>
        </div>

        {/* A scroller in its own right — the design shows a fourth tile
          * clipped at the edge, which is what says it scrolls. */}
        <ul className="flex snap-x gap-2.5 overflow-x-auto p-4 [scrollbar-width:thin] motion-safe:scroll-smooth">
          {content.entries.map((entry) => (
            <li key={entry.id} className="shrink-0 snap-start">
              <Link
                to={entry.href}
                className="relative flex size-30 flex-col justify-end overflow-hidden rounded-md stroke-gradient bg-muted p-3 shadow-tile"
              >
                {entry.image ? (
                  <>
                    <img
                      src={entry.image.url}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover"
                    />
                    {/* Scrim so the label keeps its contrast over a photo. */}
                    <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent,color-mix(in_oklch,var(--background)_44%,transparent))]" />
                  </>
                ) : null}
                <span className="relative text-h5 font-medium text-foreground">
                  {entry.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section
      aria-labelledby={headingId}
      data-slot="editorial-card"
      data-kind="promotion"
      className="mx-4 flex flex-col gap-6 rounded-lg border border-ring bg-background p-4"
    >
      <Badge>{content.badge}</Badge>
      <h2 id={headingId} className="font-serif text-display-md leading-tight text-foreground">
        {content.headline}
      </h2>
      <p className="text-body-xs text-muted-foreground">
        {content.caption}{' '}
        {/* Underlined ALWAYS, not on hover. This link sits inside a block of
          * text, and champagne on muted grey is far below the 3:1 that would
          * let colour carry the distinction on its own — so without a
          * permanent underline it fails SC 1.4.1. axe's `link-in-text-block`
          * catches it, and the e2e suite asserts that. */}
        <Link
          to={content.cta.href}
          className="text-emphasis underline underline-offset-4"
        >
          {content.cta.label}
        </Link>
      </p>
    </section>
  )
}
