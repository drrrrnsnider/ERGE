import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router'
import {
  ExperienceCard,
  ExperienceCardSkeleton,
} from '@/components/app/experience-card'
import { EmptyState } from '@/components/patterns/empty-state'
import { ErrorState } from '@/components/patterns/error-state'
import { TabPillBar } from '@/components/patterns/tab-pill-bar'
import { getExperiencesByIds } from '@/lib/api/experiences'
import type { CollectionItem } from '@/lib/api/schemas/collection'
import { toApiError } from '@/lib/api/schemas/error'
import type { Experience } from '@/lib/api/schemas/experience'
import { tabState } from '@/lib/tabs'
import { savedQuery, useSaved } from '@/lib/use-saved'

/**
 * Library — Saved experiences (Figma 230:9755). The first collection screen.
 *
 * ONE LIST ARCHETYPE, FIRST INSTANCE. Cart, Trip, Wishlist, List and Saved
 * are one shape (docs/design-brief.md), and Saved is the one with no
 * metadata and one action: unsave. When the next collection is built, the
 * list below is what it should grow from rather than be copied.
 *
 * WHAT IS ON SCREEN IS A SNAPSHOT, ON PURPOSE. The rows are the saved
 * collection as it was when you arrived. Unsaving does not take the row
 * away at once — it turns into "… was removed" with Undo, in the same
 * place, so nothing jumps under your thumb and a mis-tap is one tap to put
 * right (Darrin's call). Undo counts down over 6s and then the row folds
 * away; under reduced motion there is no countdown and it stays for the
 * visit. So the row list comes from its own query, read once per visit,
 * while whether each row is still saved comes live from `useSaved`.
 *
 * Wishlists and Trips are not built; their pills go to the not-built route.
 * The frame's `+` is deliberately absent until it has something to make.
 */

const SECTIONS = [
  { label: 'Experiences', to: '/library' },
  { label: 'Wishlists', to: '/library/wishlists' },
  { label: 'Trips', to: '/library/trips' },
] as const

type Row = { item: CollectionItem; experience: Experience }

/**
 * The saved list, as of arriving.
 *
 * `gcTime: 0` throws the snapshot away the moment Library unmounts, so the
 * next visit always reads afresh — which is what makes a removed row
 * actually go. Nothing invalidates it while you are here, so unsaving and
 * Undo never re-shuffle it under you.
 */
function useSavedSnapshot() {
  const client = useQueryClient()
  return useQuery({
    queryKey: ['library', 'saved-snapshot'],
    queryFn: async (): Promise<Row[]> => {
      const collection = await client.fetchQuery(savedQuery)
      const { items } = await getExperiencesByIds(
        collection.items.map((i) => i.experienceId),
      )
      const byId = new Map(items.map((e) => [e.experienceId, e]))
      /* An id whose experience has been delisted drops out here rather than
       * drawing an empty row. It stays in the collection; there is no design
       * for "you saved something that is gone" yet. */
      return collection.items.flatMap((item) => {
        const experience = byId.get(item.experienceId)
        return experience ? [{ item, experience }] : []
      })
    },
    gcTime: 0,
    staleTime: 0,
  })
}

export function LibraryRoute() {
  const snapshot = useSavedSnapshot()
  const saved = useSaved()
  const listRef = useRef<HTMLUListElement>(null)

  const emptyLinkRef = useRef<HTMLAnchorElement>(null)

  /* Where focus goes next. Every action here makes the control that was
   * pressed disappear — the heart turns into the message, the message turns
   * back into the card, and an expired message leaves the list — so without
   * this focus would fall to <body> and a keyboard or screen reader user
   * would be thrown to the top. Held as a function that FINDS the element,
   * because the element does not exist yet when the action happens. */
  const [focus, setFocus] = useState<{ find: () => HTMLElement | null | undefined } | null>(
    null,
  )
  const [announcement, setAnnouncement] = useState('')

  /* Rows whose message counted down and left. For this visit only, like
   * the snapshot itself. */
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    if (focus === null) return
    const target = focus.find()
    /* The row may not have changed yet — the optimistic update lands a tick
     * after the tap — which is why this also runs when the collection
     * changes. Once focus has landed the request is cleared, so a later
     * refetch cannot pull focus back from wherever the user has gone. */
    if (target) {
      target.focus()
      setFocus(null)
    }
  }, [focus, saved.collection, dismissed])

  /** A control inside one row, found when asked for. */
  const inRow = (id: string, slot: string) => () =>
    listRef.current
      ?.querySelector(`[data-experience-id="${CSS.escape(id)}"]`)
      ?.querySelector<HTMLElement>(`[data-slot="${slot}"]`)

  const remove = (row: Row) => {
    saved.toggle(row.experience.experienceId)
    setAnnouncement(`${row.experience.title} was removed`)
    setFocus({ find: inRow(row.experience.experienceId, 'undo') })
  }

  const undo = (row: Row) => {
    saved.restore(row.item)
    setAnnouncement(`${row.experience.title} is back in your saved list`)
    setFocus({ find: inRow(row.experience.experienceId, 'save-button') })
  }

  /**
   * The countdown ran out and the row has collapsed: take it off the list.
   *
   * Focus moves ONLY if it was on this row — the Undo the user was sitting
   * on is about to stop existing. If they had already gone elsewhere, a
   * timer firing must not pull them back. It goes to the next row, or the
   * previous one if this was the last, or the empty state's link if this
   * was the only one; whichever control that row has, heart or Undo.
   */
  const dismiss = (id: string, item: HTMLElement) => {
    if (item.contains(document.activeElement)) {
      const neighbour = (item.nextElementSibling ?? item.previousElementSibling)
        ?.getAttribute('data-experience-id')
      setFocus({
        find: () =>
          neighbour
            ? (inRow(neighbour, 'save-button')() ?? inRow(neighbour, 'undo')())
            : emptyLinkRef.current,
      })
    }
    setDismissed((current) => new Set(current).add(id))
  }

  const rows = snapshot.data?.filter((row) => !dismissed.has(row.item.experienceId))

  /* Until the live collection is here, every row would read as unsaved and
   * flash as removed. The snapshot fetches it first, so this is a guard
   * rather than a state anyone sees. */
  const isRemoved = (id: string) =>
    saved.collection !== undefined && !saved.isSaved(id)

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <header className="flex h-12 items-center">
        <h1 className="font-serif text-display-md text-foreground">Library</h1>
      </header>

      <TabPillBar label="Library sections" items={SECTIONS} />

      {/* Spoken, not shown — the row itself says the same thing visibly.
        * Present from the start, so the first change is announced. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {snapshot.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <ExperienceCardSkeleton key={i} variant="media-sm" className="w-full" />
          ))}
        </div>
      ) : null}

      {snapshot.isError ? (
        <ErrorState
          error={toApiError(snapshot.error)}
          onRetry={() => void snapshot.refetch()}
        />
      ) : null}

      {rows?.length === 0 ? (
        /* No design for this yet — see docs/backlog.md. The generic pattern
         * with words that say what to do, not just that nothing is here. */
        <EmptyState
          title="Nothing saved yet"
          description="Tap the heart on anything you'd like to come back to."
          action={
            /* A link that is really a target, so it carries
             * data-slot="button" and gets the 44px floor on a phone. */
            <Link
              ref={emptyLinkRef}
              to="/"
              data-slot="button"
              className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-card px-4 text-body-md text-primary"
            >
              Explore experiences
            </Link>
          }
        />
      ) : null}

      {rows !== undefined && rows.length > 0 ? (
        <ul ref={listRef} aria-label="Saved experiences" className="flex flex-col gap-4">
          {rows.map((row) => (
            <SavedRow
              key={row.item.experienceId}
              row={row}
              removed={isRemoved(row.item.experienceId)}
              onRemove={() => remove(row)}
              onUndo={() => undo(row)}
              onGone={(item) => dismiss(row.item.experienceId, item)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * One list item: the card, or the message it turns into, with the change
 * between them animated.
 */
function SavedRow({
  row,
  removed,
  onRemove,
  onUndo,
  onGone,
}: {
  row: Row
  removed: boolean
  onRemove: () => void
  onUndo: () => void
  /** The countdown ended and the row has finished collapsing. */
  onGone: (item: HTMLElement) => void
}) {
  const ref = useRef<HTMLLIElement>(null)
  useMorph(ref, removed)

  /* Fold the row away, then report it gone. Height to nothing, and the
   * list's gap cancelled by a matching negative margin, so the rows below
   * close up smoothly rather than jumping 16px at the end. Motion tokens,
   * as in useMorph. Reduced motion never gets here — it has no countdown. */
  const collapse = () => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const gap = el.parentElement ? getComputedStyle(el.parentElement).rowGap : '0px'
    /* The gap sits above every row but the first; the first's sits below. */
    const margin = el.previousElementSibling ? 'marginTop' : 'marginBottom'
    el.style.overflow = 'hidden'
    el.animate(
      [
        { height: `${el.getBoundingClientRect().height}px`, opacity: 1, [margin]: '0px' },
        { height: '0px', opacity: 0, [margin]: `-${gap}` },
      ],
      {
        duration: parseFloat(token(root, '--motion-duration-moderate')),
        easing: token(root, '--motion-easing-exit'),
        fill: 'forwards',
      },
    ).finished.then(() => onGone(el), () => undefined)
  }

  return (
    <li ref={ref} data-experience-id={row.item.experienceId}>
      {removed ? (
        <RemovedRow experience={row.experience} onUndo={onUndo} onExpire={collapse} />
      ) : (
        <ExperienceCard
          experience={row.experience}
          variant="media-sm"
          className="w-full"
          saved
          onToggleSave={onRemove}
        />
      )}
    </li>
  )
}

/** A motion token's value, read from CSS so Figma stays the source. */
function token(el: Element, name: string) {
  return getComputedStyle(el).getPropertyValue(name).trim()
}

/**
 * The card-to-message change, animated. Runs whenever `state` changes.
 *
 * WHY JAVASCRIPT. The card and the message are two different elements with
 * two different natural heights — 80px, and 48px or more as the title
 * wraps. CSS cannot ease between those across browsers (animating to an
 * `auto` height is Chromium-only), so this measures and uses the browser's
 * own Web Animations API. No library.
 *
 * WHAT MOVES. The row's box eases from the old height to the new one, the
 * surface's corners ease between the card's radius and the message's, and
 * the new contents fade in. The surface itself does not fade: card and
 * message are both Surface/Card, so it reads as one tile changing shape
 * rather than one thing swapped for another.
 *
 * Durations and easings are the Figma Motion tokens, read from CSS at run
 * time — Moderate/Standard for the shape, Base/Enter for the arrival — so
 * retuning the scale in Figma retunes this too.
 *
 * Reduced motion skips it entirely: the swap is instant, as it was.
 *
 * The heights are measured after React has already swapped the elements,
 * so the "from" is the one recorded at the previous change. A resize in
 * between would start the ease from a slightly stale height; it still ends
 * in the right place.
 */
function useMorph(ref: RefObject<HTMLElement | null>, state: unknown) {
  const last = useRef<{ height: number; radius: string } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const surface = el?.firstElementChild
    if (!el || !(surface instanceof HTMLElement)) return

    const now = {
      height: el.getBoundingClientRect().height,
      radius: getComputedStyle(surface).borderRadius,
    }
    const from = last.current
    last.current = now
    if (from === null) return // first render: nothing to animate from
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const root = document.documentElement
    const shape = {
      duration: parseFloat(token(root, '--motion-duration-moderate')),
      easing: token(root, '--motion-easing-standard'),
    }

    /* Clipped while it moves: growing back on Undo, the card is taller than
     * the box for a moment and would otherwise spill into the gap below. */
    el.style.overflow = 'hidden'
    el.animate([{ height: `${from.height}px` }, { height: `${now.height}px` }], shape)
      .finished.then(
        () => el.style.removeProperty('overflow'),
        () => el.style.removeProperty('overflow'),
      )
    surface.animate([{ borderRadius: from.radius }, { borderRadius: now.radius }], shape)

    for (const child of surface.children) {
      child.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: parseFloat(token(root, '--motion-duration-base')),
        easing: token(root, '--motion-easing-enter'),
      })
    }
  }, [ref, state])
}

/**
 * What an unsaved row becomes: a tiny thumbnail, "<title> was removed", and
 * Undo. The title still opens the experience, so a removal you meant can
 * still be followed up.
 *
 * Not in Figma — composed from existing roles to Darrin's description, and
 * logged in docs/backlog.md for a design. Card surface so it reads as the
 * same row in a different state, not as a toast.
 *
 * Concentric corners: the row is Radius/sm (12) with an 8px inset, so the
 * thumbnail is Radius/xs (4) — 12 − 8. That is a step tighter than the
 * cards' md, because md would need an 8px inner radius the scale lacks.
 */
function RemovedRow({
  experience,
  onUndo,
  onExpire,
}: {
  experience: Experience
  onUndo: () => void
  /** The countdown on Undo has run out. */
  onExpire: () => void
}) {
  const image = experience.images[0]
  return (
    <div
      data-slot="removed-row"
      /* The cards' own edge, Border/Default fading out, so the tile keeps
       * its outline as it changes shape. */
      className="flex items-center gap-3 rounded-sm bg-card p-2 stroke-gradient-card"
    >
      <div className="size-8 shrink-0 overflow-hidden rounded-xs bg-muted">
        {image ? (
          /* Decorative: the title beside it names the same thing. */
          <img src={image.url} alt="" className="size-full object-cover" />
        ) : null}
      </div>
      <p className="min-w-0 flex-1 text-body-md text-muted-foreground">
        <Link
          to={`/experience/${experience.experienceId}`}
          state={tabState('Library')}
          className="text-foreground"
        >
          {experience.title}
        </Link>{' '}
        was removed
      </p>
      <button
        type="button"
        data-slot="undo"
        aria-label={`Undo, put ${experience.title} back`}
        onClick={onUndo}
        /* The countdown's END is the timer — see `animate-countdown` in
         * theme.css. Named, because animationend bubbles and nothing else
         * should be able to dismiss the row by finishing. */
        onAnimationEnd={(event) => {
          /* The underline runs the same countdown on a ::after and its end
           * bubbles here too. Only the word's own counts. */
          if (event.animationName === 'countdown' && event.pseudoElement === '') {
            onExpire()
          }
        }}
        /* THE COUNTDOWN. The word sweeps from Action/Primary to Text/Muted,
         * left to right, over 6s; when it finishes the message goes.
         *
         * It is a time limit, so WCAG 2.2.1 applies: it PAUSES while a
         * pointer rests on Undo or keyboard focus is on it, and resumes on
         * leaving. A tap on a phone moves focus here without it counting as
         * keyboard focus, so the countdown still runs for touch. Under
         * reduced motion there is no countdown at all — the word stays
         * Primary and the message stays for the visit (Darrin's call). */
        className="group h-8 shrink-0 rounded-full px-3 text-body-md font-medium"
      >
        {/* The pause is triggered by the BUTTON — its whole target — and
          * applied to the word, which is what carries the countdown. */}
        <span className="text-countdown animate-countdown group-hover:[animation-play-state:paused] group-focus-visible:[animation-play-state:paused] motion-reduce:animate-none">
          Undo
        </span>
      </button>
    </div>
  )
}
