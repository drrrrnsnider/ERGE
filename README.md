# ERGE

A mobile-first trip planner that pulls flights, hotels, restaurants, rideshare
and events into one itinerary. Built as a static single-page app so it can be
wrapped for the App Store later.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

Browser tests need their browser downloaded once:

```bash
npx playwright install
```

## Scripts

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                         |
| `npm run build`     | Typecheck, then production build into `dist/`      |
| `npm run preview`   | Serve the built `dist/` to check it for real       |
| `npm run lint`      | oxlint                                             |
| `npm run typecheck` | TypeScript, strict mode                            |
| `npm test`          | Unit tests (Vitest)                                |
| `npm run test:e2e`  | Browser + accessibility tests (Playwright + axe)   |
| `npm run check`     | lint + typecheck + unit tests, as CI would run     |

## How the code is organised

Every folder below has its own README explaining what belongs in it.

```
src/
  tokens/         generated design tokens from Figma — NEVER hand-edited
  styles/         the theme bridge: what those tokens mean
  components/ui/  shadcn primitives, vendored from upstream
  components/app/ our domain components (FlightCard, ItineraryTimeline…)
  layouts/        layout archetypes — the frames screens render inside
  routes/         page-level screens, one per URL
  lib/api/        typed API layer, Zod schemas
  mocks/          mock data, swappable for real providers
docs/             design brief, user flows, interaction spec, API contract
e2e/              Playwright browser tests
```

## Design tokens

The most important convention in the project:

```
Figma  ──▶  src/tokens/tokens.css  ──▶  src/styles/theme.css  ──▶  components
            generated primitives       hand-written meaning       role names
            "brand-600 is #1266d6"     "primary IS brand-600"     "uses primary"
```

The transform runs one way only. Nothing in `src/tokens/` is edited by hand — a
change there exists nowhere else and is destroyed on the next export.

To change how something looks, edit **`src/styles/theme.css`**, not a component.
Because shadcn components only ever refer to role names, they can stay identical
to upstream, and `npx shadcn@latest add …` never produces a merge conflict.

## Accessibility

Target is **WCAG 2.2 AA**, enforced in two places:

- **`src/tokens/tokens.test.ts`** reads the real CSS and fails the build if any
  foreground/surface pairing drops below 4.5:1 (text) or 3:1 (controls and
  focus rings), in either theme. It checks the whole matrix, including
  combinations no screen renders yet.
- **`e2e/accessibility.spec.ts`** runs axe-core against real pages in a real
  browser, in both light and dark.

Neither is sufficient alone, and both together are not a substitute for testing
with a keyboard and a screen reader. axe catches roughly a third to a half of
WCAG issues.

## Stack

React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS v4 · shadcn/ui on Radix ·
React Router 8 (library mode) · TanStack Query · React Hook Form + Zod ·
Lucide · Vitest · Playwright · axe-core

Deliberately **not** installed yet: Capacitor, PWA plugin, Storybook.
