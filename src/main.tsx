import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import '@/index.css'

/**
 * App entry point. Everything the whole app needs is switched on here, once:
 *
 *   StrictMode          React's development-only double-check for unsafe patterns
 *   QueryClientProvider makes the data cache available to every screen
 *   RouterProvider      renders whichever screen matches the current URL
 */

/**
 * Records whether the person is currently navigating by keyboard, as
 * `data-keyboard-nav` on <html>. theme.css uses it to show the focus ring on
 * text fields only for someone tabbing between them.
 *
 * WHY THIS IS NOT JUST `:focus-visible`. For most controls it would be —
 * a button clicked with a mouse does not match `:focus-visible`. Text inputs
 * are the documented exception: the spec has them match ALWAYS, including on
 * click, because normally you do want to see where typing will go. Our fields
 * already answer that with their border, so the ring is left to do the one
 * job `:focus-visible` cannot express here.
 *
 * Tab only, not any key. Typing into a field is also `keydown`, so a broader
 * rule would light the ring up the moment someone started typing in a field
 * they had clicked into. Shift+Tab reports the same `key`, so it is covered.
 *
 * Capture phase, so this still records the interaction if something further
 * down stops the event. Both listeners are passive: they never call
 * preventDefault, so they cannot interfere with the interaction itself.
 */
const KEYBOARD_NAV = 'keyboardNav'
addEventListener(
  'keydown',
  (event) => {
    if (event.key === 'Tab') document.documentElement.dataset[KEYBOARD_NAV] = ''
  },
  { capture: true, passive: true },
)
addEventListener(
  'pointerdown',
  () => {
    delete document.documentElement.dataset[KEYBOARD_NAV]
  },
  { capture: true, passive: true },
)

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('No #root element found in index.html')

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
