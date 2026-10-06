import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Our type scale, taught to tailwind-merge.
 *
 * WHY THIS LIST HAS TO EXIST
 * --------------------------
 * `cn()` runs tailwind-merge so a later class can override an earlier one.
 * To do that it has to know which classes conflict, and it works that out
 * from the class NAME. It ships knowing Tailwind's stock scale — `text-sm`,
 * `text-lg` and so on — and it knows `text-foreground` is a colour. It has
 * never heard of `text-body-md`.
 *
 * Faced with an unknown `text-*`, it guesses colour. So it decided that
 * `text-body-md` and `text-foreground` were two colours competing for the
 * same slot, kept the last one, and DELETED THE SIZE. Silently — no error,
 * no warning, and the text simply inherited 16px from its parent instead.
 *
 * That was live in five places before it was noticed, because the fallback
 * is a plausible-looking size rather than something obviously broken:
 * ButtonFlow, ChipFilter and the Input's field and helper text were all
 * rendering at 16px where the design says 14 and 12.
 *
 * Listing the scale here puts these classes in the `font-size` group, where
 * they conflict with each other and with nothing else. `utils.test.ts` reads
 * the list straight out of theme.css and fails if the two drift, so adding a
 * size there and forgetting it here is a failed build rather than another
 * silent 16px.
 */
const FONT_SIZES = [
  'display-md',
  'display-sm',
  'h2',
  'h3',
  'h4',
  'h5',
  'body-lg',
  'body-md',
  'body-sm',
  'body-xs',
  'section-xxs',
  'section-xs',
]

const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: FONT_SIZES }] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Exported for the test that keeps it in step with theme.css. */
export { FONT_SIZES }

/**
 * The design's separator between pieces of a meta line — "Miami Beach, FL
 * •  3 hrs": TWO spaces either side of the bullet, everywhere. Use
 * `joinMeta`, never a hand-typed `' • '`.
 *
 * Non-breaking spaces, because a browser collapses repeated ordinary spaces
 * to one. Typing two was not enough — the experience card did, and still
 * rendered one either side, while the detail screen needed
 * `white-space: pre-wrap` to keep its pair. These need no CSS.
 *
 * Both spaces before the bullet are non-breaking, and only the first after
 * it, so a line that has to wrap breaks AFTER the bullet: it stays with the
 * piece it follows rather than starting the next line.
 */
export const META_SEPARATOR = '\u00a0\u00a0•\u00a0 '

/** Joins the parts that exist, skipping empty ones, with META_SEPARATOR. */
export function joinMeta(parts: ReadonlyArray<string | null | undefined | false>) {
  return parts.filter(Boolean).join(META_SEPARATOR)
}
