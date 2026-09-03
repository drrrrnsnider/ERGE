# `src/routes/` — page-level screens

One file per screen. A screen is what a URL resolves to: search, results, an
itinerary day, a booking detail.

Screens are the **only** place that fetches data. They call TanStack Query, deal
with loading and error states, and hand plain typed props down to the domain
components in [`../components/app/`](../components/app/README.md). Keeping
fetching at this one level is what makes everything below it trivial to test and
preview.

## Adding a screen

1. Add the file here, exporting one named component.
2. Register it in [`src/router.tsx`](../router.tsx).

Routes are declared as plain data in that one file rather than inferred from
filenames, so the full set of screens is readable in one place.

## Current

- `home.tsx` — placeholder. It proves the token → theme → component chain
  renders. Delete it once there's a real first screen.

## Screen checklist

- Exactly one `<h1>`, and headings that descend without skipping levels.
- Loading and error states are designed, not left as a bare spinner or a thrown
  exception.
- Anything interactive is reachable and operable by keyboard alone.
- The route has a case in `e2e/accessibility.spec.ts`.
