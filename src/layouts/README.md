# `src/layouts/` — layout archetypes

The frames screens render inside. A layout owns page-level structure — app
chrome, navigation, scroll containers, safe-area padding. It does not own
content.

Each layout renders React Router's `<Outlet />`, which is the hole the current
screen drops into. Because the layout stays mounted while screens swap, state
that should survive navigation (a scroll position, an open nav drawer) belongs
in the layout rather than the screen.

## Current

- `root-layout.tsx` — the outermost shell. Single column, full viewport height,
  and the skip link that lets keyboard users jump the chrome.

## Likely to come

- an itinerary shell with a persistent bottom tab bar
- a focused/modal archetype for booking flows, where chrome gets out of the way

## Mobile-first and the native wrap

This app gets packaged for the App Store, so layouts are where the device
realities get handled: `min-h-dvh` rather than `min-h-screen` (mobile browser
chrome resizes the viewport), and `env(safe-area-inset-*)` padding for the notch
and home indicator on anything pinned to a screen edge.
