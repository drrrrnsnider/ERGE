import { useLocation } from 'react-router'

/**
 * Which tab you are under — docs/user-flows.md, Navigation: "the tab you
 * started from stays lit".
 *
 * TWO ANSWERS, IN ORDER.
 *
 *   1. The tab stamped on this history entry. A card's link stamps the tab
 *      it was tapped under, so the same `/experience/…` lights Library when
 *      opened from Saved and Explore when opened from a rail. It lives in
 *      the history entry — React Router's `state` — rather than anywhere
 *      global, so Back restores the right tab for free: each entry keeps
 *      its own.
 *   2. The path, for anything that arrived without a stamp — a shared link
 *      opened cold, a refresh in a browser that dropped the state, a typed
 *      URL. `owns` lists the paths beneath each tab.
 *
 * Here rather than in the layout because the card's link needs it too, and
 * a component reaching up into a layout would be the wrong way round.
 */

export const TAB_ROUTES = {
  Explore: { to: '/', owns: ['/search', '/experience'] },
  Concierge: { to: undefined, owns: [] },
  Cart: { to: undefined, owns: [] },
  Library: { to: '/library', owns: ['/library'] },
  Profile: { to: undefined, owns: [] },
} as const satisfies Record<
  string,
  { to: string | undefined; owns: readonly string[] }
>

export type TabName = keyof typeof TAB_ROUTES

const isTab = (value: unknown): value is TabName =>
  typeof value === 'string' && Object.hasOwn(TAB_ROUTES, value)

/** Whether `pathname` is `path` or somewhere below it. */
const isWithin = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`)

/**
 * The history-entry state a link passes to carry its tab along. Spread it
 * into a Link's `state`. Read back by `useCurrentTab`, and nothing else.
 */
export const tabState = (tab: TabName | undefined) =>
  tab === undefined ? undefined : { tab }

export function useCurrentTab(): TabName | undefined {
  const { pathname, state } = useLocation()

  /* `state` is whatever the last navigation passed — unknown, and survives
   * in the browser's history across versions of the app — so it is checked
   * rather than trusted. */
  const stamped: unknown =
    typeof state === 'object' && state !== null && 'tab' in state
      ? state.tab
      : undefined
  if (isTab(stamped)) return stamped

  for (const [name, { to, owns }] of Object.entries(TAB_ROUTES)) {
    if (to !== undefined && pathname === to) return name as TabName
    if (owns.some((path) => isWithin(pathname, path))) return name as TabName
  }
  return undefined
}
