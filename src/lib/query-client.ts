import { QueryClient } from '@tanstack/react-query'

/**
 * One shared TanStack Query client for the app.
 *
 * TanStack Query is the cache between our screens and the network: it handles
 * loading and error states, dedupes identical requests, and re-fetches stale
 * data. Screens ask for data; they never hold it.
 *
 * The defaults below are tuned for a travel app used on a phone, where the
 * network is unreliable and re-fetching on every window focus is wasteful.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Treat data as fresh for a minute before considering a re-fetch.
      staleTime: 60_000,
      // Phones move between networks constantly; a couple of retries absorbs
      // the blips without leaving the user staring at a spinner.
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})
