import { useSyncExternalStore } from 'react'

/**
 * Whether a CSS media query currently matches, as React state.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`, because the
 * effect version renders once with the wrong answer and then corrects itself.
 * For something that decides WHICH component to render — a sheet or a popover
 * — that first wrong render is a real flash and, worse, a mount and immediate
 * unmount of the wrong one.
 *
 * The server snapshot is `false`. There is no server here, but a static
 * prerender would have no window, and guessing "desktop" on a page whose
 * whole design is mobile-first is the wrong way to be wrong.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
